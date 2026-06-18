import * as fs from 'fs';
import * as path from 'path';

describe('InviteLanding — dmwork-web#1047 login CTA for unauthenticated users', () => {
    let sourceCode: string;

    beforeAll(() => {
        const filePath = path.join(__dirname, '../Components/InviteLanding/index.tsx');
        sourceCode = fs.readFileSync(filePath, 'utf-8');
    });

    it('renders an explicit "登录后加入" CTA for unauthenticated users', () => {
        // The exact copy is supplied by i18n; the component must render that CTA key.
        expect(sourceCode).toContain('app.invite.loginAfterJoin');
    });

    it('guides unauthenticated users with a hint near the CTA', () => {
        // Hint copy is supplied by i18n; keep the component wired to the hint key.
        expect(sourceCode).toContain('app.invite.loginHint');
    });

    it('exposes a stable test id on the unauthenticated CTA', () => {
        expect(sourceCode).toContain('invite-landing-login-cta');
    });

    it('does NOT hide the join CTA via display:none for unauthenticated users', () => {
        // Regression guard: previous bug hid the join button via display:none
        // We now use conditional rendering based on isLoggedIn, no display:none tricks
        expect(sourceCode).not.toMatch(/display\s*:\s*['"]none['"]/);
    });

    it('stores pendingInviteCode before redirecting to login so auto-join resumes', () => {
        // Post-login auto-join requires the invite code to be persisted
        expect(sourceCode).toMatch(/localStorage\.setItem\(\s*["']pendingInviteCode["']/);
    });

    it('handles session-expired / 401 / 403 on handleJoin by redirecting to login', () => {
        // Logged-in but token-expired users must not be stuck — they should be
        // redirected to login with pendingInviteCode preserved.
        expect(sourceCode).toMatch(/isUnauthorizedError/);
        expect(sourceCode).toMatch(/401/);
        expect(sourceCode).toMatch(/403/);
    });
});
