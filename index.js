const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const fs = require('fs');
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

  // ===== FILTRO =====
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
    message.channel.send(`🎉 ${message.author} subió a nivel ${data.level}`);

    // 🔥 SISTEMA DE RANGOS AUTOMÁTICO
    const rankRoles = [
      { level: 5, name: "Novato" },
      { level: 10, name: "Activo" },
      { level: 20, name: "Pro" }
    ];

    for (const rank of rankRoles) {
      if (data.level === rank.level) {

        let role = message.guild.roles.cache.find(r => r.name === rank.name);

        if (!role) {
          role = await message.guild.roles.create({ name: rank.name });
        }

        const member = message.guild.members.cache.get(message.author.id);
        if (member) await member.roles.add(role);

        message.channel.send(`🏆 ${message.author} obtuvo el rango ${rank.name}`);
      }
    }
  }

  levels.set(message.author.id, data);
});

// ================= INTERACCIONES =================
    client.on('interactionCreate', async interaction => {
  try {

    // ===== COMANDOS =====
    if (interaction.isChatInputCommand()) {

      switch (interaction.commandName) {

        case "ping":
          return interaction.reply("🏓 Pong!");

        case "codigo":
          return interaction.reply({
            content: "💻 https://github.com/jeremyninja15/discord",
            ephemeral: true
          });

        case "rol":

          if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: "❌ Solo admins", ephemeral: true });
          }

          const usuario = interaction.options.getUser("usuario");
          const tipo = interaction.options.getString("tipo");

          const member = interaction.guild.members.cache.get(usuario.id);

          if (!member) return interaction.reply("❌ Usuario no encontrado");

          if (tipo === "mod") {

            let role = interaction.guild.roles.cache.find(r => r.name === "Moderador");

            if (!role) {
              role = await interaction.guild.roles.create({
                name: "Moderador",
                permissions: [PermissionsBitField.Flags.KickMembers]
              });
            }

            await member.roles.add(role);
            return interaction.reply(`👮 ${usuario.tag} ahora es MOD`);
          }

          if (tipo === "admin") {

            if (interaction.user.id !== interaction.guild.ownerId) {
              return interaction.reply({ content: "🚫 Solo el dueño puede dar admin", ephemeral: true });
            }

            let role = interaction.guild.roles.cache.find(r =>
              r.permissions.has(PermissionsBitField.Flags.Administrator)
            );

            if (!role) {
              role = await interaction.guild.roles.create({
                name: "Administrador",
                permissions: [PermissionsBitField.Flags.Administrator]
              });
            }

            await member.roles.add(role);
            return interaction.reply(`👑 ${usuario.tag} ahora es ADMIN`);
          }

        case "crearbot":
          const { embed, row } = getCrearBotEmbed();
          return interaction.reply({ embeds: [embed], components: [row] });

        case "panelroles":

          if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: "❌ Solo admins", ephemeral: true });
          }

          const embedRoles = new EmbedBuilder()
            .setColor("Blue")
            .setTitle("🎛 Panel de Roles")
            .setDescription("Gestiona roles fácilmente");

          const rowRoles = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("dar_mod").setLabel("👮 Dar Mod").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("dar_admin").setLabel("👑 Dar Admin").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("quitar_roles").setLabel("❌ Quitar Roles").setStyle(ButtonStyle.Secondary)
          );

          return interaction.reply({ embeds: [embedRoles], components: [rowRoles] });
      }
    }

    // ===== BOTONES =====
    if (interaction.isButton()) {

      if (interaction.customId === "dar_mod") {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
          return interaction.reply({ content: "❌ Solo admins", ephemeral: true });
        }

        return interaction.reply({
          content: "⚠ Usa /rol usuario: @persona tipo: mod",
          ephemeral: true
        });
      }

      if (interaction.customId === "dar_admin") {
        if (interaction.user.id !== interaction.guild.ownerId) {
          return interaction.reply({ content: "🚫 Solo el dueño del servidor", ephemeral: true });
        }

        return interaction.reply({
          content: "⚠ Usa /rol usuario: @persona tipo: admin",
          ephemeral: true
        });
      }

      if (interaction.customId === "quitar_roles") {
        const member = interaction.member;
        const roles = member.roles.cache.filter(r => r.id !== interaction.guild.id);

        try {
          await member.roles.remove(roles);

          return interaction.reply({
            content: "❌ Roles eliminados correctamente",
            ephemeral: true
          });

        } catch (error) {
          console.error(error);
          return interaction.reply({
            content: "⚠ Error al quitar roles (permisos del bot)",
            ephemeral: true
          });
        }
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
