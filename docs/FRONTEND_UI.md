Based on your contract and requirements, I'd recommend a **3-page structure** with a bottom navigation bar for a clean, direct mobile experience:

## Page Structure

### 1. **Home/Purchase Page** (Default Landing)
This should be the main conversion driver - immediately show value and enable quick purchases.

**Layout:**
```
┌─────────────────────────┐
│ 🔨 JC4P Dev Hours       │ <- Simple header
├─────────────────────────┤
│                         │
│ [Your Balance]          │
│ ┌─────────────────────┐ │
│ │  2 hours available  │ │ <- Large, clear balance
│ └─────────────────────┘ │
│                         │
│ "Get direct access to   │ <- Value prop, humble tone
│  consulting, code       │
│  reviews, training, or  │
│  custom development"    │
│                         │
│ ┌─────────────────────┐ │
│ │ Buy Hours           │ │ <- Primary CTA
│ │ ┌─────┬─────┬─────┐│ │
│ │ │  1  │  2  │  5  ││ │ <- Quick select buttons
│ │ └─────┴─────┴─────┘│ │
│ │ Custom: [___] hrs   │ │
│ │                     │ │
│ │ 300 USDC/hour       │ │
│ │ You save: 5% ✓      │ │ <- Show discount if eligible
│ │                     │ │
│ │ [Purchase →]        │ │ <- Single action button
│ └─────────────────────┘ │
│                         │
│ [12/100 hrs available] │ <- Scarcity indicator
│                         │
├─────────────────────────┤
│ Home │ Redeem │ History │ <- Bottom nav
└─────────────────────────┘
```

### 2. **Redeem Page**
Simple form for work requests with clear limits.

**Layout:**
```
┌─────────────────────────┐
│ ← Redeem Hours          │
├─────────────────────────┤
│                         │
│ Your Balance: 2 hours   │
│ Weekly limit: 6/8 used  │ <- Clear constraints
│                         │
│ ┌─────────────────────┐ │
│ │ How many hours?     │ │
│ │ ┌─────┬─────┬─────┐│ │
│ │ │  1  │  2  │ Max ││ │ <- Max = min(balance, weekly remaining)
│ │ └─────┴─────┴─────┘│ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ Describe your need: │ │
│ │ ┌─────────────────┐ │ │
│ │ │                 │ │ │
│ │ │ "I need help    │ │ │
│ │ │  with..."       │ │ │ <- Placeholder examples
│ │ │                 │ │ │
│ │ └─────────────────┘ │ │
│ │                     │ │
│ │ Examples:          │ │
│ │ • Smart contract   │ │
│ │   security review  │ │
│ │ • Architecture     │ │
│ │   consultation     │ │
│ │ • Code review      │ │
│ │ • Custom feature   │ │
│ └─────────────────────┘ │
│                         │
│ [Submit Request →]      │
│                         │
├─────────────────────────┤
│ Home │ Redeem │ History │
└─────────────────────────┘
```

### 3. **History Page**
Transaction history with status tracking.

**Layout:**
```
┌─────────────────────────┐
│ ← Activity              │
├─────────────────────────┤
│ [Purchases│Redemptions] │ <- Toggle
│                         │
│ ┌─────────────────────┐ │
│ │ Oct 25, 2024        │ │
│ │ Redeemed 2 hours    │ │
│ │ "Contract review"   │ │
│ │ Status: In Progress │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ Oct 20, 2024        │ │
│ │ Purchased 5 hours   │ │
│ │ 1,425 USDC (5% off) │ │
│ └─────────────────────┘ │
│                         │
├─────────────────────────┤
│ Home │ Redeem │ History │
└─────────────────────────┘
```

## Key Design Principles

### 1. **Humble but Confident Messaging**
- "Get direct access to..." instead of "Hire the best developer"
- Focus on outcomes rather than credentials
- Let scarcity (X/100 available) speak to demand

### 2. **Friction Reduction**
- Pre-set hour quantities (1, 2, 5) for quick decisions
- Show discounts automatically without requiring codes
- One-tap purchase with USDC permit signature
- Mobile-optimized inputs and buttons

### 3. **Trust Signals**
- Real-time availability counter
- Clear pricing with discount visibility
- Transaction history for transparency
- Weekly limits shown upfront

### 4. **Visual Hierarchy**
- Balance prominently displayed
- Primary action (Purchase) gets most visual weight
- Secondary info (limits, discounts) visible but not overwhelming

### 5. **Progressive Disclosure**
- Home page focuses on purchase (primary conversion)
- Complex redemption flow on separate page
- History tucked away but accessible

## Optional Enhancements

1. **Social Proof Widget** (if humble enough):
   ```
   "Join 47 others who've booked this month"
   ```

2. **Quick FAQ**:
   - Inline tooltips on key elements
   - "What can I use hours for?" expandable

3. **Status Indicators**:
   - Green dot for "Taking new requests"
   - Yellow for "Limited availability"

This structure prioritizes conversion while maintaining the humble, professional tone you want. The mobile-first design ensures smooth interactions on iPhone 12-sized screens, and the clear information architecture helps users understand the value proposition immediately.
