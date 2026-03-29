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

// ================= FILTRO =================
const blacklist = ['tonto', 'idiota', 'maldicion'];

// ================= READY =================
client.once('clientReady', () => {
  console.log(`🔥 ${client.user.tag} activo`);
});

// ================= MENSAJES =================
client.on('messageCreate', async message => {
  if (!message.guild || message.author.bot) return;

  const msg = message.content.toLowerCase();

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
        await member.ban({ reason: "Exceso de advertencias" });
        texto += `\n🔨 Baneado`;
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

      const user = interaction.options.getUser("usuario");
      const razon = interaction.options.getString("razon");

      switch (interaction.commandName) {

        case "ping":
          return interaction.reply("🏓 Pong!");

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
\`\`\`js
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => console.log("Bot listo"));
client.login("TU_TOKEN");
\`\`\`

📄 package.json
\`\`\`json
{
  "name": "bot-pro",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "discord.js": "^14.0.0"
  }
}
\`\`\`

📄 .env
TOKEN=tu_token_aqui
          `,
          ephemeral: true
        });
      }

      if (interaction.customId === "zip") {

        const output = fs.createWriteStream('./bot.zip');
        const archive = archiver('zip');

        archive.pipe(output);

        archive.append(`console.log("Bot base listo");`, { name: 'index.js' });
        archive.append(`{ "name": "bot", "version": "1.0.0" }`, { name: 'package.json' });

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
