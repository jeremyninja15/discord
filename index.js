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
const { getCrearBotEmbed } = require('./crear');

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
const strikes = {};

if (fs.existsSync('./advertencias.json')) {
  warns = JSON.parse(fs.readFileSync('./advertencias.json'));
}

function saveWarns() {
  fs.writeFileSync('./advertencias.json', JSON.stringify(warns, null, 2));
}

// ================= FILTRO =================
const insultos = require('./insultos.json');
const blacklist = insultos.palabras;

// ================= READY =================
client.once('ready', () => {
  console.log(`🔥 ${client.user.tag} activo`);
});

// ================= MENSAJES =================
client.on('messageCreate', async message => {
  if (!message.guild || message.author.bot) return;

  const msg = message.content.toLowerCase().replace(/[^a-z0-9]/gi, '');
  const bad = blacklist.some(p => msg.includes(p));

  if (bad) {
    if (!warns[message.author.id]) warns[message.author.id] = 0;

    if (!warnedTemp.has(message.author.id)) {
      warnedTemp.set(message.author.id, true);

      const restantes = 3 - warns[message.author.id];

      return message.reply(
        `⚠ ${message.author}\n📊 Advertencias: ${warns[message.author.id]}/3\n❗ Te quedan ${restantes} antes de ser ${strikes[message.author.id] ? "baneado" : "expulsado"}`
      );
    }

    warns[message.author.id]++;
    saveWarns();

    let texto = `⚠ ${message.author.tag} tiene ${warns[message.author.id]}/3 advertencias`;

    if (warns[message.author.id] >= 3) {
      const member = message.guild.members.cache.get(message.author.id);

      if (member) {
        if (!strikes[message.author.id]) {
          await member.kick();
          strikes[message.author.id] = true;
          warns[message.author.id] = 0;
          texto += `\n👢 Expulsado (segunda oportunidad)`;
        } else {
          await member.ban();
          warns[message.author.id] = 0;
          texto += `\n🔨 Baneado por reincidir`;
        }
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

    if (interaction.isChatInputCommand()) {

      switch (interaction.commandName) {

        case "ping":
          return interaction.reply("🏓 Pong!");

        case "codigo":
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor("Purple")
                .setTitle("💻 Código del bot")
                .setDescription("[Haz click aquí](https://github.com/jeremyninja15/discord)")
            ],
            ephemeral: true
          });

        case "nivel": {
          const data = levels.get(interaction.user.id) || { xp: 0, level: 1 };
          return interaction.reply(`📊 Nivel ${data.level} | XP ${data.xp}`);
        }

        case "warn": {
          const user = interaction.options.getUser("usuario");
          if (!user) return interaction.reply("❌ Usuario inválido");

          if (!warns[user.id]) warns[user.id] = 0;
          warns[user.id]++;
          saveWarns();

          return interaction.reply(`⚠ ${user.tag} tiene ${warns[user.id]} advertencias`);
        }

        case "warns": {
          const user = interaction.options.getUser("usuario");
          if (!user) return interaction.reply("❌ Usuario inválido");

          return interaction.reply(`📋 ${user.tag} tiene ${warns[user.id] || 0} advertencias`);
        }

        case "ban": {
          if (!interaction.memberPermissions.has(PermissionsBitField.Flags.BanMembers))
            return interaction.reply({ content: "❌ Sin permisos", ephemeral: true });

          const user = interaction.options.getUser("usuario");
          const member = interaction.guild.members.cache.get(user.id);

          if (!member || !member.bannable)
            return interaction.reply("❌ No puedo banearlo");

          await member.ban();
          return interaction.reply(`🔨 ${user.tag} baneado`);
        }

        case "kick": {
          if (!interaction.memberPermissions.has(PermissionsBitField.Flags.KickMembers))
            return interaction.reply({ content: "❌ Sin permisos", ephemeral: true });

          const user = interaction.options.getUser("usuario");
          const member = interaction.guild.members.cache.get(user.id);

          if (!member || !member.kickable)
            return interaction.reply("❌ No puedo expulsarlo");

          await member.kick();
          return interaction.reply(`👢 ${user.tag} expulsado`);
        }

        case "clear": {
          if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageMessages))
            return interaction.reply({ content: "❌ Sin permisos", ephemeral: true });

          const cantidad = interaction.options.getInteger("cantidad");

          if (cantidad < 1 || cantidad > 100)
            return interaction.reply("❌ Debe ser entre 1 y 100");

          await interaction.deferReply({ ephemeral: true });
          await interaction.channel.bulkDelete(cantidad, true);

          return interaction.editReply(`🧹 ${cantidad} mensajes eliminados`);
        }

        case "imagen": {
          const prompt = interaction.options.getString("prompt");

          await interaction.deferReply();

          const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;

          const embed = new EmbedBuilder()
            .setColor("Purple")
            .setTitle("🖼 Imagen generada")
            .setDescription(`Prompt: **${prompt}**`)
            .setImage(url);

          return interaction.editReply({ embeds: [embed] });
        }

        case "help":
          return interaction.reply({
            content: `
📌 Comandos:
/ping
/nivel
/warn
/warns
/ban
/kick
/clear
/imagen
/panel
/crearbot
/help
/invite
`,
            ephemeral: true
          });

        case "invite":
          return interaction.reply({
            content: `🔗 https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot%20applications.commands`,
            ephemeral: true
          });

        case "crearbot": {
          const { embed, row } = getCrearBotEmbed();
          return interaction.reply({ embeds: [embed], components: [row] });
        }

      }
    }

    // ===== BOTONES =====
    if (interaction.isButton()) {

      if (interaction.customId === "codigo_btn") {
        return interaction.reply({
          content: "💻 https://github.com/jeremyninja15/discord",
          ephemeral: true
        });
      }

      if (interaction.customId === "zip") {

        const output = fs.createWriteStream('./bot.zip');
        const archive = archiver('zip');

        archive.pipe(output);

        archive.append(`console.log("Bot base listo");`, { name: 'index.js' });

        archive.finalize();

        output.on('close', async () => {
          const file = new AttachmentBuilder('./bot.zip');
          await interaction.reply({
            content: "📦 Aquí tienes tu bot",
            files: [file],
            ephemeral: true
          });
        });
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
console.log("🚀 Iniciando bot...");

client.login(process.env.TOKEN)
  .then(() => console.log("✅ Bot conectado"))
  .catch(err => console.error("❌ Error:", err));
