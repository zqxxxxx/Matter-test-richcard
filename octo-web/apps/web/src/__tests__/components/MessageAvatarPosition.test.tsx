import fs from "fs";
import path from "path";

describe("MessageBase Avatar Position", () => {
    const cssPath = path.resolve(
        __dirname,
        "../../../../../packages/dmworkbase/src/Messages/Base/index.css"
    );

    let cssContent: string;

    beforeAll(() => {
        cssContent = fs.readFileSync(cssPath, "utf-8");
    });

    it("message rows should top-align the avatar with the message body", () => {
        const rowMatch = cssContent.match(
            /\.wk-message-base-box\s*\{[^}]+\}/
        );
        expect(rowMatch).not.toBeNull();
        expect(rowMatch![0]).toMatch(/align-items:\s*flex-start/);
    });

    it("senderAvatar should be a stable flex item instead of absolute-positioned", () => {
        // Extract the .senderAvatar rule
        const senderAvatarMatch = cssContent.match(
            /\.senderAvatar\s*\{[^}]+\}/
        );
        expect(senderAvatarMatch).not.toBeNull();

        const senderAvatarRule = senderAvatarMatch![0];

        expect(senderAvatarRule).toMatch(/flex-shrink:\s*0/);
        expect(senderAvatarRule).not.toMatch(/position:\s*absolute/);
        expect(senderAvatarRule).not.toMatch(/bottom:\s*\d+px/);
    });

    it("senderAvatar should have correct dimensions", () => {
        const senderAvatarMatch = cssContent.match(
            /\.senderAvatar\s*\{[^}]+\}/
        );
        expect(senderAvatarMatch).not.toBeNull();

        const senderAvatarRule = senderAvatarMatch![0];

        expect(senderAvatarRule).toMatch(/width:\s*32px/);
        expect(senderAvatarRule).toMatch(/height:\s*32px/);
    });
});
