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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

let warns = {};
const levels = new Map();

if (fs.existsSync('./advertencias.json')) {
  warns = JSON.parse(fs.readFileSync('./advertencias.json'));
}

function saveWarns() {
  fs.writeFileSync('./advertencias.json', JSON.stringify(warns, null, 2));
}

client.once('ready', () => {
  console.log(`🔥 ${client.user.tag} activo`);
});

client.on('messageCreate', message => {
  if (!message.guild || message.author.bot) return;

  const data = levels.get(message.author.id) || { xp: 0, level: 1 };

  data.xp += 10;

  if (data.xp >= data.level * 100) {
    data.level++;
    message.channel.send(`🎉 ${message.author} subió a nivel ${data.level}`);
  }

  levels.set(message.author.id, data);
});

client.on('interactionCreate', async interaction => {
  try {

    if (!interaction.isChatInputCommand()) return;

    const user = interaction.options.getUser("usuario");
    const razon = interaction.options.getString("razon");

    switch (interaction.commandName) {

      case "ping":
        return interaction.reply("🏓 Pong!");

      case "nivel":
        const data = levels.get(interaction.user.id) || { xp: 0, level: 1 };
        return interaction.reply(`📊 Nivel ${data.level} | XP ${data.xp}`);

      case "warn":
        if (!user) return interaction.reply("❌ Usuario inválido");

        if (!warns[user.id]) warns[user.id] = 0;
        warns[user.id]++;
        saveWarns();

        return interaction.reply(`⚠ ${user.tag} tiene ${warns[user.id]} advertencias`);

      case "warns":
        if (!user) return interaction.reply("❌ Usuario inválido");

        return interaction.reply(`📋 ${user.tag} tiene ${warns[user.id] || 0} advertencias`);

      case "help":
        return interaction.reply({
          content: "/ping\n/nivel\n/warn\n/warns\n/help",
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
    }

  } catch (error) {
    console.error(error);

    if (!interaction.replied) {
      interaction.reply({
        content: "⚠ Error en el comando",
        ephemeral: true
      });
    }
  }
});

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

client.login(process.env.TOKEN);
