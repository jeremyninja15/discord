const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder
} = require('discord.js');

const fs = require('fs');
const archiver = require('archiver');

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: ['CHANNEL']
});

// ================= DATOS =================
let warns = {};
const levels = new Map();
const warnedTemp = new Map();

if (fs.existsSync('./advertencias.json')) {
  warns = JSON.parse(fs.readFileSync('./advertencias.json'));
}

function saveWarns() {
  fs.writeFileSync('./advertencias.json', JSON.stringify(warns, null, 2));
}

// ================= PALABRAS =================
const blacklist = ['tonto', 'idiota', 'maldicion'];

// ================= READY =================
client.once('clientReady', () => {
  console.log(`🔥 ${client.user.tag} activo`);
});

// ================= MENSAJES =================
client.on('messageCreate', async message => {
  if (!message.guild || message.author.bot) return;

  const msg = message.content.toLowerCase();

  // ===== FILTRO =====
  const bad = blacklist.some(p => msg.includes(p));

  if (bad) {

    if (!warnedTemp.has(message.author.id)) {
      warnedTemp.set(message.author.id, true);
      return message.reply(`⚠ ${message.author}, evita insultar.`);
    }

    if (!warns[message.author.id]) warns[message.author.id] = 0;
    warns[message.author.id]++;
    saveWarns();

    let texto = `⚠ ${message.author.tag} tiene ${warns[message.author.id]} advertencias`;

    if (warns[message.author.id] >= 3) {
      const member = message.guild.members.cache.get(message.author.id);
      if (member) {
        await member.ban();
        texto += `\n🔨 Baneado por exceso de advertencias`;
      }
    }

    warnedTemp.delete(message.author.id);
    return message.reply(texto);
  }

  // ===== NIVELES =====
  const data = levels.get(message.author.id) || { xp: 0, level: 1 };

  data.xp += 10;

  if (data.xp >= data.level * 100) {
    data.level++;
    message.channel.send(`🎉 ${message.author} subió a nivel ${data.level}`);
  }

  levels.set(message.author.id, data);
});

// ================= INTERACCIONES =================
client.on('interactionCreate', async interaction => {
  try {

    // ===== COMANDOS =====
    if (interaction.isChatInputCommand()) {

      const user = interaction.options.getUser?.("usuario");

      switch (interaction.commandName) {

        case "ping":
          return interaction.reply("🏓 Pong!");

        case "nivel": {
          const data = levels.get(interaction.user.id) || { xp: 0, level: 1 };
          return interaction.reply(`📊 Nivel ${data.level} | XP ${data.xp}`);
        }

        case "warn":
          if (!user) return interaction.reply("Usuario no encontrado.");
          if (!warns[user.id]) warns[user.id] = 0;
          warns[user.id]++;
          saveWarns();
          return interaction.reply(`⚠ ${user.tag} ahora tiene ${warns[user.id]} warns`);

        case "warns":
          if (!user) return interaction.reply("Usuario no encontrado.");
          return interaction.reply(`📋 ${user.tag} tiene ${warns[user.id] || 0} advertencias`);

        case "help":
          return interaction.reply({
            content: `
📌 Comandos:
/ping
/nivel
/warn
/warns
/crearbot
/help
/invite
            `,
            ephemeral: true
          });

        case "invite":
          return interaction.reply({
            content: `🔗 Invita el bot:
https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot%20applications.commands`,
            ephemeral: true
          });

        case "crearbot":

          const embed = new EmbedBuilder()
            .setColor("Purple")
            .setTitle("🤖 Crear tu bot")
            .setDescription("Usa los botones 👇");

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("paso1").setLabel("Crear bot").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("paso2").setLabel("Token").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("archivos").setLabel("📄 Archivos base").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("zip").setLabel("📦 Descargar bot").setStyle(ButtonStyle.Success)
          );

          return interaction.reply({ embeds: [embed], components: [row] });
      }
    }

    // ===== BOTONES =====
    if (interaction.isButton()) {

      if (interaction.customId === "paso1") {
        return interaction.reply({
          content: "👉 https://discord.com/developers/applications → New Application → Bot",
          ephemeral: true
        });
      }

      if (interaction.customId === "paso2") {
        return interaction.reply({
          content: "🔑 Bot → Reset Token → copia tu TOKEN",
          ephemeral: true
        });
      }

      if (interaction.customId === "archivos") {
        return interaction.reply({
          content: `
📦 ARCHIVOS BASE

📄 index.js
\`\`\`js
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('clientReady', () => console.log("Bot listo"));
client.login("TU_TOKEN");
\`\`\`

📄 package.json
\`\`\`json
{
  "name": "mi-bot",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "discord.js": "^14.0.0"
  }
}
\`\`\`
          `,
          ephemeral: true
        });
      }

      if (interaction.customId === "zip") {

        const output = fs.createWriteStream('./bot.zip');
        const archive = archiver('zip');

        archive.pipe(output);

        archive.append(`const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.once('clientReady', () => console.log("Bot listo"));
client.login("TU_TOKEN");`, { name: 'index.js' });

        archive.append(`{
  "name": "mi-bot",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "discord.js": "^14.0.0"
  }
}`, { name: 'package.json' });

        await archive.finalize();

        setTimeout(async () => {
          const file = new AttachmentBuilder('./bot.zip');
          await interaction.reply({
            content: "📦 Aquí tienes tu bot:",
            files: [file],
            ephemeral: true
          });
        }, 1000);
      }
    }

  } catch (error) {
    console.error(error);

    if (interaction.isRepliable() && !interaction.replied) {
      await interaction.reply({
        content: "⚠ Error en el bot",
        ephemeral: true
      });
    }
  }
});

// ================= LOGIN =================
client.login(process.env.TOKEN);
