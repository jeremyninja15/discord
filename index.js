const {
  Client,
  GatewayIntentBits,
  PermissionsBitField
} = require('discord.js');

const axios = require('axios');
const fs = require('fs');

// ================= GELBOORU =================
async function gelbooru(tag) {
  try {
    const url = `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=${encodeURIComponent(tag)}`;

    const res = await axios.get(url);
    const posts = res.data.post;

    if (!posts || posts.length === 0) return null;

    const random = posts[Math.floor(Math.random() * posts.length)];
    return random.file_url;

  } catch (err) {
    console.log("Gelbooru error:", err.message);
    return null;
  }
}

// ================= DATA =================
const insultos = require('./insultos.json');
const blacklist = insultos.palabras;

const { Client: NekosClient } = require("nekos-best.js");
const nekos = new NekosClient();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

// ================= STORAGE =================
let warns = {};
const levels = new Map();
const warnedTemp = new Map();

if (fs.existsSync('./advertencias.json')) {
  warns = JSON.parse(fs.readFileSync('./advertencias.json'));
}

function saveWarns() {
  fs.writeFileSync('./advertencias.json', JSON.stringify(warns, null, 2));
}

// ================= READY =================
client.once('ready', () => {
  console.log(`🔥 ${client.user.tag} activo`);
});

// ================= MESSAGES =================
client.on('messageCreate', async message => {
  if (!message.guild || message.author.bot) return;

  const msg = message.content.toLowerCase().replace(/[^a-z0-9]/gi, '');
  const bad = blacklist.some(p => msg.includes(p));

  if (bad) {
    try { await message.delete(); } catch {}

    if (!warnedTemp.has(message.author.id)) {
      warnedTemp.set(message.author.id, true);

      const aviso = await message.channel.send(
        `⚠ ${message.author} evita insultos.`
      );

      setTimeout(() => aviso.delete().catch(() => {}), 15000);
      return;
    }

    warnedTemp.delete(message.author.id);

    if (!warns[message.author.id]) warns[message.author.id] = 0;

    warns[message.author.id]++;
    saveWarns();

    if (warns[message.author.id] >= 3) {
      try {
        const member = await message.guild.members.fetch(message.author.id);
        await member.kick();
        warns[message.author.id] = 0;
      } catch {}
    }
  }

  // LEVELS
  const data = levels.get(message.author.id) || { xp: 0, level: 1 };

  data.xp += 10;

  if (data.xp >= data.level * 100) {
    data.level++;
    message.channel.send(`🎉 ${message.author} subió a nivel ${data.level}`);
  }

  levels.set(message.author.id, data);
});

// ================= INTERACTIONS =================
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  try {
    switch (interaction.commandName) {

      case "ping":
        return interaction.reply("🏓 Pong!");

      case "nivel": {
        const data = levels.get(interaction.user.id) || { xp: 0, level: 1 };
        return interaction.reply(`📊 Nivel ${data.level} | XP ${data.xp}`);
      }

      case "help":
        return interaction.reply("📌 ping, nivel, ban, kick, warn, warns, clear, rol, quitar, invite, hentai, nsfw");

      case "invite": {
        const link = `https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
        return interaction.reply(`🔗 ${link}`);
      }

      // ================= HENTAI (NEKOS) =================
      case "hentai": {

        const tag = interaction.options.getString("tag") || "neko";

        if (!interaction.channel.nsfw) {
          return interaction.reply({ content: "❌ Solo NSFW", ephemeral: true });
        }

        try {
          const res = await nekos.fetch(tag, 1);
          const url = res.results?.[0]?.url;

          return interaction.reply(url || "❌ Sin resultado");

        } catch (err) {
          console.log(err);
          return interaction.reply("❌ Error API Nekos");
        }
      }

      // ================= GELBOORU NSFW =================
      case "nsfw": {

        const tag = interaction.options.getString("tag") || "neko";

        if (!interaction.channel.nsfw) {
          return interaction.reply({
            content: "❌ Solo NSFW",
            ephemeral: true
          });
        }

        try {
          const img = await gelbooru(tag);

          if (!img) {
            return interaction.reply("❌ Sin resultados");
          }

          return interaction.reply(img);

        } catch (err) {
          console.log(err);
          return interaction.reply("❌ Error Gelbooru");
        }
      }

      // ================= WARN =================
      case "warn": {
        const user = interaction.options.getUser("usuario");

        if (!warns[user.id]) warns[user.id] = 0;

        warns[user.id]++;
        saveWarns();

        return interaction.reply(`⚠ ${user.tag} tiene ${warns[user.id]}`);
      }

      case "warns": {
        const user = interaction.options.getUser("usuario");
        return interaction.reply(`📋 ${warns[user.id] || 0}`);
      }

    }

  } catch (err) {
    console.error(err);
    return interaction.reply({ content: "❌ Error", ephemeral: true });
  }
});

// ================= LOGIN =================
client.login(process.env.TOKEN);
