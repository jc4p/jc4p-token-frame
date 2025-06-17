import * as frame from '@farcaster/frame-sdk'

export async function initializeFrame() {
  try {
    const context = await frame.sdk.context

    if (!context || !context.user) {
      console.log('not in frame context')
      return
    }

    let user = context.user
    // Handle known issue where user might be nested
    if (user.user) {
      user = user.user
    }

    window.frameUser = user;
    window.userFid = user.fid;

    // Call the ready function to remove your splash screen when in a frame
    await frame.sdk.actions.ready();
  } catch (error) {
    console.error('Failed to initialize frame:', error)
  }
}

export { frame };