// Hub link constants (EMR / Epic URLs and tips). Nov 5 2026: the static HUB_DATA rate
// table (May 2026 MRF + 2026 Medicare $) was removed — nothing imported it, and stale
// dollars must not be re-wired. Live rates come from Supabase (pricing.*).

// NextGen EMR runs on the AWS remote desktop — desktop-only link (Oct 2026).
export const NEXTGEN_URL = "https://rdg102818.nextgenmcs.com/RDWeb/Pages/en-US/login.aspx";
// UMass Epic runs on the UMass "FollowMe Desktop" (Lauren Marchand's setup email, Feb 5 2026;
// Mari Oct 20 2026: link beside NextGen). Epic user name + password + RSA code; then the
// Windows 10 link on the left; choose HTML5 if no pop-up appears (gear, top right).
export const UMASS_EPIC_URL = "https://view.umassmemorial.org/";
export const UMASS_EPIC_TIP = "Open UMass Epic (FollowMe Desktop) in a new tab. Sign in with your Epic user name, password and RSA code, then click the Windows 10 link on the left. No pop-up? Gear (top right) → HTML5.";
// LEA Epic (Greg Lyons, LEA IT, Oct 23 2026; Mari Oct 24: beside NextGen and UMass Epic):
// Lexington Eye's Epic through the Partners Citrix portal. Needs Citrix Workspace installed.
export const LEA_EPIC_URL = "https://workspace.partners.org";
export const LEA_EPIC_TIP = "Open LEA Epic (Partners Citrix portal) in a new tab. Needs Citrix Workspace installed on this computer. Sign in with your Partners login, then click the Epic icon.";
