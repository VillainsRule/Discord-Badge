import fetch from 'node-fetch';

const truncate = (input) => (input.length > 32 ? `${input.substring(0, 32)}...` : input);
const encodeHTML = (input) => input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&quot;').replace(/'/g, '&apos;');
const processText = (input) => encodeHTML(truncate(input));
const imageToBase64 = (image) => fetch(image).then((r) => r.arrayBuffer()).then((data) => Buffer.from(data).toString('base64'));

export default async function parsePresence(user) {
    let username = processText(user.user.username);
    let pfpImage = user.user.displayAvatarURL({
        format: 'jpg',
        dynamic: true,
        size: 512,
    });

    pfpImage = await imageToBase64(pfpImage);
    pfpImage = 'data:image/png;base64,' + pfpImage;

    const statuses = user.presence?.clientStatus;
    if (!statuses) return {
        username,
        pfpImage,
        status: 'offline',
        gameType: 'Offline',
        game: '',
        details: '',
        detailsImage: false,
        state: '',
        height: 97,
    };

    const status = statuses.desktop || statuses.mobile || statuses.web;
    const playingRichGame = user.presence.activities.reverse().find((e) => e.details || e.state);
    const playingGame = user.presence.activities.reverse().find((e) => !e.details && !e.state);
    const spotifyGame = user.presence.activities.find((e) => e.type == 'LISTENING' && e.name == 'Spotify');
    const gameObject = playingRichGame || playingGame || spotifyGame;

    if (!gameObject) return {
        username,
        pfpImage,
        status,
        gameType: '',
        game: '',
        details: '',
        detailsImage: false,
        state: '',
        height: 97,
    }

    const game = processText(gameObject.name);
    let gameType = 'Playing';
    if (game == 'Spotify') gameType = 'Listening to';

    if (!gameObject.details && !gameObject.state) return {
        username,
        pfpImage,
        status,
        gameType,
        game,
        details: '',
        detailsImage: false,
        state: '',
        height: 97,
    }

    const details = gameObject.details ? processText(gameObject.details) : '';

    let detailsImage = false;
    if (gameObject.assets && gameObject.assets.largeImage) {
        // 'mp:' prefixed assets don't use keys and will use different image url formatting
        // as according to https://discord.com/developers/docs/topics/gateway-events#activity-object-activity-asset-image

        if (gameObject.assets.largeImage.startsWith('mp:')) detailsImage = `https://media.discordapp.net/${gameObject.assets.largeImage.substring(3)}`;
        else if (game == 'Spotify') detailsImage = `https://i.scdn.co/image/${gameObject.assets.largeImage.replace('spotify:', '')}`;
        else detailsImage = `https://cdn.discordapp.com/app-assets/${gameObject.applicationID}/${gameObject.assets.largeImage}.png`;

        detailsImage = await imageToBase64(detailsImage);
        detailsImage = 'data:image/png;base64,' + detailsImage;
    };

    const state = gameObject.state ? processText(gameObject.state) : '';

    return {
        username,
        pfpImage,
        status,
        game,
        gameType,
        details,
        detailsImage,
        state,
        height: 187,
    };
}