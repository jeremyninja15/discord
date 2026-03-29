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
const strikes = {}; // segunda oportunidad

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
client.once('clientReady', () => {
  console.log(`🔥 ${client.user.tag} activo`);
});

// ================= MENSAJES =================
client.on('messageCreate', async message => {
  if (!message.guild || message.author.bot) return;

  const msg = message.content
  .toLowerCase()
  .replace(/[^a-z0-9]/gi, '');

  const bad = blacklist.some(p => msg.includes(p));

  if (bad) {

    if (!warns[message.author.id]) warns[message.author.id] = 0;

    // PRIMER AVISO
    if (!warnedTemp.has(message.author.id)) {
      warnedTemp.set(message.author.id, true);

      const restantes = 3 - warns[message.author.id];

      return message.reply(
        `⚠ ${message.author}\n📊 Advertencias: ${warns[message.author.id]}/3\n❗ Te quedan ${restantes} antes de ser ${strikes[message.author.id] ? "baneado" : "expulsado"}`
      );
    }

    // SUMAR WARN
    warns[message.author.id]++;
    saveWarns();

    let texto = `⚠ ${message.author.tag} tiene ${warns[message.author.id]}/3 advertencias`;

    if (warns[message.author.id] >= 3) {

      const member = message.guild.members.cache.get(message.author.id);

      if (member) {

        // PRIMERA VEZ → KICK
        if (!strikes[message.author.id]) {
          await member.kick("Primera oportunidad");
          strikes[message.author.id] = true;
          warns[message.author.id] = 0;

          texto += `\n👢 Expulsado (segunda oportunidad)`;
        }

        // SEGUNDA VEZ → BAN
        else {
          await member.ban({ reason: "Reincidencia" });
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

      const user = interaction.options.getUser("usuario");
      const razon = interaction.options.getString("razon");

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

        case "warn":
          if (!user) return interaction.reply("❌ Usuario no válido");
          if (!warns[user.id]) warns[user.id] = 0;
          warns[user.id]++;
          saveWarns();
          return interaction.reply(`⚠ ${user.tag} tiene ${warns[user.id]} advertencias`);

        case "warns":
          return interaction.reply(`📋 ${user.tag} tiene ${warns[user.id] || 0} advertencias`);

        case "ban":
          if (!interaction.memberPermissions.has(PermissionsBitField.Flags.BanMembers))
            return interaction.reply({ content: "❌ Sin permisos", ephemeral: true });

          const memberBan = interaction.guild.members.cache.get(user.id);
          if (!memberBan) return interaction.reply("❌ No encontrado");

          await memberBan.ban({ reason: razon || "Sin razón" });
          return interaction.reply(`🔨 ${user.tag} baneado`);

        case "kick":
          if (!interaction.memberPermissions.has(PermissionsBitField.Flags.KickMembers))
            return interaction.reply({ content: "❌ Sin permisos", ephemeral: true });

          const memberKick = interaction.guild.members.cache.get(user.id);
          if (!memberKick) return interaction.reply("❌ No encontrado");

          await memberKick.kick(razon || "Sin razón");
          return interaction.reply(`👢 ${user.tag} expulsado`);

        case "clear":
          if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageMessages))
            return interaction.reply({ content: "❌ Sin permisos", ephemeral: true });

          const cantidad = interaction.options.getInteger("cantidad");

          await interaction.deferReply({ ephemeral: true });
          await interaction.channel.bulkDelete(cantidad, true);

          return interaction.editReply(`🧹 ${cantidad} mensajes eliminados`);

        case "panel":
          try {
            await interaction.user.send("📲 Panel activado");
            return interaction.reply({ content: "✅ Revisa tu DM", ephemeral: true });
          } catch {
            return interaction.reply({ content: "❌ No puedo enviarte DM", ephemeral: true });
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
/panel
/crearbot
/help
/invite
/código
            `,
            ephemeral: true
          });

        case "invite":
          return interaction.reply({
            content: `🔗 https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot%20applications.commands`,
            ephemeral: true
          });

        case "crearbot":

          const embed = new EmbedBuilder()
            .setColor("Purple")
            .setTitle("🤖 Crear tu bot PRO")
            .setDescription("Guía completa con archivos y descarga");

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("archivos").setLabel("📄 Ver archivos").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("zip").setLabel("📦 Descargar bot").setStyle(ButtonStyle.Success)
          );

          return interaction.reply({ embeds: [embed], components: [row] });
      }
    }

    // ===== BOTONES =====
    if (interaction.isButton()) {

      if (interaction.customId === "archivos") {
        return interaction.reply({
          content: `
📦 ARCHIVOS COMPLETOS

📄 index.js
📄 package.json
📄 .env
📄 config.json
📄 comandos/

💡 Incluye estructura profesional lista para escalar
          `,
          ephemeral: true
        });
      }

      if (interaction.customId === "zip") {

        const output = fs.createWriteStream('./bot.zip');
        const archive = archiver('zip');

        archive.pipe(output);

        archive.append(`console.log("Bot base listo");`, { name: 'index.js' });
        archive.append(`{ "name": "bot-pro", "version": "1.0.0" }`, { name: 'package.json' });
        archive.append(`TOKEN=tu_token_aqui`, { name: '.env' });

        await archive.finalize();

        setTimeout(async () => {
          const file = new AttachmentBuilder('./bot.zip');
          await interaction.reply({
            content: "📦 Aquí tienes tu bot",
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
