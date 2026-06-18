import * as fs from 'fs';
import * as path from 'path';

describe('InviteLanding security: no hardcoded verification code', () => {
    let sourceCode: string;

    beforeAll(() => {
        const filePath = path.join(__dirname, '../Components/InviteLanding/index.tsx');
        sourceCode = fs.readFileSync(filePath, 'utf-8');
    });

    describe('registration API', () => {
        it('should not contain hardcoded verification code "123456"', () => {
            // Check for the specific hardcoded code pattern
            const hardcodedCodePattern = /code\s*:\s*["']123456["']/;
            expect(sourceCode).not.toMatch(hardcodedCodePattern);
        });

        it('should not perform registration from the invite landing page', () => {
            // Registration now lives in the login module. InviteLanding should only
            // persist the invite and route users to login, never mint an account here.
            expect(sourceCode).not.toMatch(/user\/(?:username)?register/);
        });

        it('should not use user/register endpoint with code parameter', () => {
            // The old vulnerable pattern was: user/register with code: "123456"
            const vulnerablePattern = /user\/register.*code/s;
            expect(sourceCode).not.toMatch(vulnerablePattern);
        });

        it('should not send legacy register-only flag parameters', () => {
            // The old register shortcut required flag=1 alongside a hardcoded code.
            // Keeping it out of this page avoids reviving that bypass.
            expect(sourceCode).not.toMatch(/flag\s*:\s*1/);
        });

        it('should include name parameter for usernameregister', () => {
            // usernameregister API requires name parameter
            expect(sourceCode).toMatch(/name\s*:/);
        });
    });

    describe('no hardcoded secrets', () => {
        it('should not contain any hardcoded 6-digit codes in JSON.stringify calls', () => {
            // Check for any hardcoded 6-digit code patterns in JSON.stringify
            const jsonWithHardcodedCode = /JSON\.stringify\([^)]*["']\d{6}["'][^)]*\)/;
            expect(sourceCode).not.toMatch(jsonWithHardcodedCode);
        });
    });
});
