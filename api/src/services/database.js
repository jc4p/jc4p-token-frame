// Helper function to format purchase records
function formatPurchase(row) {
  return {
    txHash: row.tx_hash,
    blockNumber: row.block_number,
    timestamp: row.timestamp,
    buyer: row.buyer,
    fid: row.fid,
    qty: row.qty,
    price: row.price,
    discount: row.discount_percentage > 0 ? {
      percentage: row.discount_percentage,
      reason: row.discount_reason
    } : null
  }
}

// Helper function to format redemption records
function formatRedemption(row) {
  return {
    txHash: row.tx_hash,
    blockNumber: row.block_number,
    timestamp: row.timestamp,
    user: row.user_address,
    fid: row.fid,
    qty: row.qty,
    workCID: row.work_cid,
    status: row.status
  }
}

export async function savePurchase(db, purchase) {
  const query = `
    INSERT INTO purchases (
      tx_hash, block_number, timestamp, buyer, fid, qty, price, discount_percentage, discount_reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  
  await db.prepare(query).bind(
    purchase.txHash,
    purchase.blockNumber,
    purchase.timestamp,
    purchase.buyer.toLowerCase(),
    purchase.fid || null,
    purchase.qty,
    purchase.price,
    purchase.discountPercentage || 0,
    purchase.discountReason || null
  ).run()
}

export async function saveRedemption(db, redemption) {
  const query = `
    INSERT INTO redemptions (
      tx_hash, block_number, timestamp, user_address, fid, qty, work_cid, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `
  
  await db.prepare(query).bind(
    redemption.txHash,
    redemption.blockNumber,
    redemption.timestamp,
    redemption.userAddress.toLowerCase(),
    redemption.fid || null,
    redemption.qty,
    redemption.workCID,
    redemption.status || 'pending'
  ).run()
}

export async function getPurchaseHistory(db, address, fid, limit = 50, offset = 0) {
  try {
    let whereClause = ''
    const params = []
    
    if (address && fid) {
      whereClause = 'WHERE buyer = ? OR fid = ?'
      params.push(address.toLowerCase(), fid)
    } else if (address) {
      whereClause = 'WHERE buyer = ?'
      params.push(address.toLowerCase())
    } else if (fid) {
      whereClause = 'WHERE fid = ?'
      params.push(fid)
    }
    
    // Get purchases
    const query = `
      SELECT * FROM purchases
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `
    params.push(limit, offset)
    
    const result = await db.prepare(query).bind(...params).all()
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM purchases ${whereClause}`
    const countParams = params.slice(0, -2) // Remove limit and offset
    const countResult = await db.prepare(countQuery).bind(...countParams).first()
    
    return {
      purchases: result.results.map(formatPurchase),
      pagination: {
        limit,
        offset,
        total: countResult?.count || 0,
        hasMore: offset + limit < (countResult?.count || 0)
      }
    }
  } catch (error) {
    console.error('Database error in getPurchaseHistory:', error)
    throw error
  }
}

export async function getRedemptionHistory(db, address, fid, limit = 50, offset = 0) {
  try {
    let whereClause = ''
    const params = []
    
    if (address && fid) {
      whereClause = 'WHERE user_address = ? OR fid = ?'
      params.push(address.toLowerCase(), fid)
    } else if (address) {
      whereClause = 'WHERE user_address = ?'
      params.push(address.toLowerCase())
    } else if (fid) {
      whereClause = 'WHERE fid = ?'
      params.push(fid)
    }
    
    // Get redemptions
    const query = `
      SELECT * FROM redemptions
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `
    params.push(limit, offset)
    
    const result = await db.prepare(query).bind(...params).all()
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM redemptions ${whereClause}`
    const countParams = params.slice(0, -2) // Remove limit and offset
    const countResult = await db.prepare(countQuery).bind(...countParams).first()
    
    return {
      redemptions: result.results.map(formatRedemption),
      pagination: {
        limit,
        offset,
        total: countResult?.count || 0,
        hasMore: offset + limit < (countResult?.count || 0)
      }
    }
  } catch (error) {
    console.error('Database error in getRedemptionHistory:', error)
    throw error
  }
}

export async function getGlobalActivity(db, limit = 20, offset = 0) {
  try {
    // Get recent purchases
    const purchasesQuery = `
      SELECT 
        'purchase' as type,
        tx_hash,
        block_number,
        timestamp,
        buyer as address,
        fid,
        qty,
        price,
        discount_percentage,
        discount_reason,
        NULL as work_cid,
        NULL as status
      FROM purchases
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `
    
    // Get recent redemptions
    const redemptionsQuery = `
      SELECT 
        'redemption' as type,
        tx_hash,
        block_number,
        timestamp,
        user_address as address,
        fid,
        qty,
        NULL as price,
        NULL as discount_percentage,
        NULL as discount_reason,
        work_cid,
        status
      FROM redemptions
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `
    
    // Execute both queries
    const [purchasesResult, redemptionsResult] = await Promise.all([
      db.prepare(purchasesQuery).bind(limit, offset).all(),
      db.prepare(redemptionsQuery).bind(limit, offset).all()
    ])
    
    // Combine and sort by timestamp
    const allActivities = [
      ...purchasesResult.results.map(row => ({
        type: 'purchase',
        txHash: row.tx_hash,
        blockNumber: row.block_number,
        timestamp: row.timestamp,
        address: row.address,
        fid: row.fid,
        qty: row.qty,
        price: row.price,
        discount: row.discount_percentage > 0 ? {
          percentage: row.discount_percentage,
          reason: row.discount_reason
        } : null
      })),
      ...redemptionsResult.results.map(row => ({
        type: 'redemption',
        txHash: row.tx_hash,
        blockNumber: row.block_number,
        timestamp: row.timestamp,
        address: row.address,
        fid: row.fid,
        qty: row.qty,
        workCID: row.work_cid,
        status: row.status
      }))
    ]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit)
    
    // Get total count of all activities
    const countQuery = `
      SELECT 
        (SELECT COUNT(*) FROM purchases) + 
        (SELECT COUNT(*) FROM redemptions) as total
    `
    const countResult = await db.prepare(countQuery).first()
    const total = countResult?.total || 0
    
    return {
      activities: allActivities,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total
      }
    }
  } catch (error) {
    console.error('Database error in getGlobalActivity:', error)
    throw error
  }
}