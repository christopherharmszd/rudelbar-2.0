// Reset only this evening on this device; retain other evenings and contact access.
export const noticePreferenceSuffixes=[':sound',':prompt',':setup-complete',':last-alert-clock-v2'];
export async function resetGuestApp({logout,storage,eventId}){
 await logout(); // A failed sign-out must not erase the remaining local access.
 storage.removeItem('rudelbar:evening:'+eventId+':v1');
 for(const suffix of noticePreferenceSuffixes)storage.removeItem('rudelbar:notifications:guest:'+eventId+suffix);
}
