const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder
} = require("discord.js");

const axios = require("axios");
const fs = require("fs");

// ================= GELBOORU FIXED =================



async function gelbooru(tag) {
  try {

    const url =
      `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1` +
      `&limit=100` +
      `&tags=${encodeURIComponent(tag)}` +
      `&api_key=${process.env.GEL_API_KEY}` +
      `&user_id=${process.env.GEL_USER_ID}`;

    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    let posts = res.data.post;

    if (!posts) return null;

    if (!Array.isArray(posts)) {
      posts = [posts];
    }

    // 🔥 SOLO URLs DIRECTAS BUENAS
    const valid = posts.filter(p => {

      if (!p.file_url) return false;

      const u = p.file_url.toLowerCase();

      // evitar videos y previews basura
      if (
        u.includes("/samples/") ||
        u.endsWith(".webm") ||
        u.endsWith(".mp4")
      ) return false;

      return (
        u.endsWith(".jpg") ||
        u.endsWith(".jpeg") ||
        u.endsWith(".png") ||
        u.endsWith(".gif")
      );
    });

    if (!valid.length) return null;

    const random =
      valid[Math.floor(Math.random() * valid.length)];

    return random.file_url;

  } catch (err) {

    console.log(
      "Gelbooru error:",
      err.response?.status || err.message
    );

    return null;
  }
}



// ================= DATA =================
const insultos = require("./insultos.json");
const blacklist = insultos.palabras || [];

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

if (fs.existsSync("./advertencias.json")) {
  warns = JSON.parse(fs.readFileSync("./advertencias.json"));
}

function saveWarns() {
  fs.writeFileSync("./advertencias.json", JSON.stringify(warns, null, 2));
}

// ================= READY =================
client.once("ready", () => {
  console.log(`🔥 ${client.user.tag} activo`);
});

// ================= MESSAGES =================
client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  const msg = message.content.toLowerCase().replace(/[^a-z0-9]/gi, "");
  const bad = blacklist.some(p => msg.includes(p));

  if (bad) {
    try { await message.delete(); } catch {}

    if (!warnedTemp.has(message.author.id)) {
      warnedTemp.set(message.author.id, true);

      const aviso = await message.channel.send(`⚠ ${message.author} evita insultos`);
      setTimeout(() => aviso.delete().catch(() => {}), 15000);
      return;
    }

    warnedTemp.delete(message.author.id);

    warns[message.author.id] = (warns[message.author.id] || 0) + 1;
    saveWarns();

    if (warns[message.author.id] >= 3) {
      try {
        const member = await message.guild.members.fetch(message.author.id);
        await member.kick();
        warns[message.author.id] = 0;
      } catch {}
    }
  }

  // LEVEL SYSTEM
  const data = levels.get(message.author.id) || { xp: 0, level: 1 };
  data.xp += 10;

  if (data.xp >= data.level * 100) {
    data.level++;
    message.channel.send(`🎉 ${message.author} subió a nivel ${data.level}`);
  }

  levels.set(message.author.id, data);
});

// ================= INTERACTIONS =================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {

    // ================= BASIC =================
    if (interaction.commandName === "ping") {
      return interaction.reply("🏓 Pong!");
    }

    if (interaction.commandName === "nivel") {
      const data = levels.get(interaction.user.id) || { xp: 0, level: 1 };
      return interaction.reply(`📊 Nivel ${data.level} | XP ${data.xp}`);
    }

    if (interaction.commandName === "help") {
      return interaction.reply("📌 ping, nivel, hentai, nsfw, ban, kick, clear");
    }

    if (interaction.commandName === "invite") {
      return interaction.reply(
        `https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot%20applications.commands`
      );
    }

    // ================= NEKOS =================


    
    // ================= GELBOORU =================



if (interaction.commandName === "nsfw") {

  const tag =
    interaction.options.getString("tag") || "hentai";

  if (!interaction.channel.nsfw) {
    return interaction.reply({
      content: "❌ Solo NSFW",
      ephemeral: true
    });
  }

  await interaction.deferReply();

  const img = await gelbooru(tag);

  if (!img) {
    return interaction.editReply(
      "❌ No se encontraron imágenes"
    );
  }

  const embed = new EmbedBuilder()
    .setTitle(`🔞 ${tag}`)
    .setDescription(`[Abrir imagen](${img})`)
    .setImage(img)
    .setColor("Red")
    .setFooter({
      text: "Gelbooru"
    });

  return interaction.editReply({
    embeds: [embed]
  });
}



    
    // ================= WARN =================
    if (interaction.commandName === "warn") {
      const user = interaction.options.getUser("usuario");

      warns[user.id] = (warns[user.id] || 0) + 1;
      saveWarns();

      return interaction.reply(`⚠ ${user.tag} tiene ${warns[user.id]}`);
    }

    if (interaction.commandName === "warns") {
      const user = interaction.options.getUser("usuario");
      return interaction.reply(`📋 ${warns[user.id] || 0}`);
    }

  } catch (err) {
    console.error(err);
    return interaction.reply({ content: "❌ Error", ephemeral: true });
  }
});

// ================= LOGIN =================
client.login(process.env.TOKEN);
