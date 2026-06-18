package group

import "github.com/Mininglamp-OSS/octo-server/pkg/avatarrender"

func renderDefaultGroupAvatar(groupName string, groupNo string) ([]byte, string, error) {
	text := avatarrender.IndividualText(groupName)
	if !avatarrender.Renderable(text) {
		text = avatarrender.IndividualText(groupNo)
	}
	if !avatarrender.Renderable(text) {
		text = "群"
	}
	body, err := avatarrender.Render(avatarrender.Options{
		Text: text,
		Bg:   avatarrender.ColorForSeed(groupNo),
	})
	if err != nil {
		return nil, "", err
	}
	return body, "image/png", nil
}
