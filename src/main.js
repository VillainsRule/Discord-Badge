import express from 'express';
import * as Discord from 'discord.js';

import 'dotenv/config';

import card from './card.js';
import parsePresence from './parsePresence.js';

const client = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.GuildPresences,
        Discord.GatewayIntentBits.GuildMembers,
        Discord.GatewayIntentBits.Guilds
    ]
});

const app = express();

client.login(process.env.BOT_TOKEN).then(async () => {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const allowedUsers = process.env.ALLOWED_USERS.split(',');

    app.get('/', async (req, res) => {
        const { id } = req.query;
        if (!id) return res.redirect(process.env.NOT_FOUND_REDIRECT_LINK);
        if (allowedUsers?.length && !allowedUsers?.includes(id)) return res.status(401).send(`Unauthorized`);

        res.setHeader('Content-Type', 'image/svg+xml');

        let member = await guild.members.fetch({
            withPresences: true,
            user: id
        }).catch(() => res.status(502).send(`Internal Server Error`));

        let generatedCard;
        if (member instanceof Discord.DiscordAPIError) generatedCard = new card({
            username: 'Error',
            pfpImage: 'https://cdn.discordapp.com/icons/839432085856583730/59d186ba87f3d08917893a1273dce0ae.png?size=1280',
            status: 'dnd',
            game: 'Couldn\'t fetch user.',
            gameType: 'Check',
            details: processText(member.toString()),
            detailsImage: 'https://sparkcdnwus2.azureedge.net/sparkimageassets/XPDC2RH70K22MN-08afd558-a61c-4a63-9171-d3f199738e9f',
            state: 'Internal Error.',
            height: 187,
        });
        else generatedCard = new card(await parsePresence(member));

        return res.send(generatedCard.render());
    });

    app.get('/*', (req, res) => res.redirect(process.env.NOT_FOUND_REDIRECT_LINK));

    app.listen(process.env.PORT, () => console.log('Started RPC API! http://localhost:' + process.env.PORT));
});