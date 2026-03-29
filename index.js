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

// ================= MENSAJES =================
client.on('messageCreate', async message => {
  if (!message.guild || message.author.bot) return;

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
  if (!interaction.isChatInputCommand()) return;

  try {

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
        if (!user) return interaction.reply({ content: "❌ Usuario no válido", ephemeral: true });

        if (!warns[user.id]) warns[user.id] = 0;
        warns[user.id]++;
        saveWarns();

        return interaction.reply(`⚠ ${user.tag} tiene ${warns[user.id]} advertencias`);

      case "warns":
        if (!user) return interaction.reply({ content: "❌ Usuario no válido", ephemeral: true });

        return interaction.reply(`📋 ${user.tag} tiene ${warns[user.id] || 0} advertencias`);

      case "ban":
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.BanMembers))
          return interaction.reply({ content: "❌ Sin permisos", ephemeral: true });

        if (!user) return interaction.reply({ content: "❌ Usuario no válido", ephemeral: true });

        const memberBan = interaction.guild.members.cache.get(user.id);
        if (!memberBan)
          return interaction.reply({ content: "❌ Usuario no está en el servidor", ephemeral: true });

        await memberBan.ban({ reason: razon || "Sin razón" });

        return interaction.reply(`🔨 ${user.tag} fue baneado`);

      case "kick":
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.KickMembers))
          return interaction.reply({ content: "❌ Sin permisos", ephemeral: true });

        if (!user) return interaction.reply({ content: "❌ Usuario no válido", ephemeral: true });

        const memberKick = interaction.guild.members.cache.get(user.id);
        if (!memberKick)
          return interaction.reply({ content: "❌ Usuario no está en el servidor", ephemeral: true });

        await memberKick.kick(razon || "Sin razón");

        return interaction.reply(`👢 ${user.tag} fue expulsado`);

      case "clear":
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageMessages))
          return interaction.reply({ content: "❌ Sin permisos", ephemeral: true });

        const cantidad = interaction.options.getInteger("cantidad");

        if (!cantidad || cantidad < 1 || cantidad > 100)
          return interaction.reply({ content: "❌ Debe ser entre 1 y 100", ephemeral: true });

        await interaction.deferReply({ ephemeral: true });

        await interaction.channel.bulkDelete(cantidad, true);

        return interaction.editReply(`🧹 ${cantidad} mensajes eliminados`);

      case "panel":
        try {
          await interaction.user.send("📲 Panel privado activado");
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
/invite
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
          .setTitle("🤖 Crear tu bot")
          .setDescription("Usa los botones 👇");

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("paso1").setLabel("Crear bot").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("paso2").setLabel("Token").setStyle(ButtonStyle.Primary)
        );

        return interaction.reply({ embeds: [embed], components: [row] });

      default:
        return interaction.reply({ content: "❌ Comando no reconocido", ephemeral: true });
    }

  } catch (error) {
    console.error(error);

    if (!interaction.replied) {
      interaction.reply({ content: "⚠ Error en el comando", ephemeral: true });
    }
  }
});

// ================= BOTONES =================
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "paso1") {
    return interaction.reply({
      content: "👉 https://discord.com/developers/applications",
      ephemeral: true
    });
  }

  if (interaction.customId === "paso2") {
    return interaction.reply({
      content: "🔑 Bot → Reset Token",
      ephemeral: true
    });
  }
});

// ================= LOGIN =================
client.login(process.env.TOKEN);
