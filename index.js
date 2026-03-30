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
    GatewayIntentBits.MessageContent
  ]
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

// ================= LOGS =================
function logAction(guild, texto) {
  const canal = guild.channels.cache.find(c => c.name === "logs");
  if (canal) canal.send(`📜 ${texto}`);
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

    warns[message.author.id]++;
    saveWarns();

    let texto = `⚠ ${message.author.tag} (${warns[message.author.id]}/3)`;

    if (warns[message.author.id] >= 3) {
      const member = message.guild.members.cache.get(message.author.id);

      if (!strikes[message.author.id]) {
        await member.kick();
        strikes[message.author.id] = true;
        warns[message.author.id] = 0;
        texto += "\n👢 Expulsado";
      } else {
        await member.ban();
        warns[message.author.id] = 0;
        texto += "\n🔨 Baneado";
      }
    }

    logAction(message.guild, texto);
    return message.reply(texto);
  }

  // ===== NIVELES =====
  const data = levels.get(message.author.id) || { xp: 0, level: 1 };
  data.xp += 10;

  if (data.xp >= data.level * 100) {
    data.level++;

    const roleName = `Nivel ${data.level}`;
    let role = message.guild.roles.cache.find(r => r.name === roleName);

    if (!role) {
      role = await message.guild.roles.create({ name: roleName });
    }

    const member = message.guild.members.cache.get(message.author.id);
    await member.roles.add(role);

    message.channel.send(`🎉 ${message.author} subió a ${roleName}`);
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
            content: "💻 https://github.com/jeremyninja15/discord",
            ephemeral: true
          });

        case "crearbot":
          const { embed, row } = getCrearBotEmbed();
          return interaction.reply({ embeds: [embed], components: [row] });

        case "panelroles":

          if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: "❌ Solo admins", ephemeral: true });
          }

          const embedRoles = new EmbedBuilder()
            .setColor("Blue")
            .setTitle("🎛 Panel de Roles");

          const rowRoles = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("dar_mod").setLabel("👮 Mod").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("dar_admin").setLabel("👑 Admin").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("quitar_roles").setLabel("❌ Quitar").setStyle(ButtonStyle.Secondary)
          );

          return interaction.reply({ embeds: [embedRoles], components: [rowRoles] });
      }
    }

    // ===== BOTONES =====
    if (interaction.isButton()) {

      const member = interaction.guild.members.cache.get(interaction.user.id);

      if (interaction.customId === "dar_mod") {
        const role = interaction.guild.roles.cache.find(r => r.name === "Moderador");
        if (!role) return interaction.reply("❌ Crea rol 'Moderador'");

        await member.roles.add(role);
        logAction(interaction.guild, `👮 ${interaction.user.tag} obtuvo MOD`);
        return interaction.reply({ content: "✅ Mod dado", ephemeral: true });
      }

      if (interaction.customId === "dar_admin") {

        if (interaction.user.id !== interaction.guild.ownerId) {
          return interaction.reply({ content: "🚫 Solo el dueño", ephemeral: true });
        }

        const role = interaction.guild.roles.cache.find(r =>
          r.permissions.has(PermissionsBitField.Flags.Administrator)
        );

        await member.roles.add(role);
        logAction(interaction.guild, `👑 ${interaction.user.tag} obtuvo ADMIN`);
        return interaction.reply({ content: "👑 Admin dado", ephemeral: true });
      }

      if (interaction.customId === "quitar_roles") {
        await member.roles.set([]);
        logAction(interaction.guild, `❌ ${interaction.user.tag} quitó roles`);
        return interaction.reply({ content: "❌ Roles eliminados", ephemeral: true });
      }

      if (interaction.customId === "codigo_btn") {
        return interaction.reply({
          content: "💻 https://github.com/jeremyninja15/discord",
          ephemeral: true
        });
      }
    }

  } catch (e) {
    console.error(e);
  }
});

client.login(process.env.TOKEN);
