const {
  Client,
  GatewayIntentBits,
  PermissionsBitField
} = require('discord.js');

const fs = require('fs');
const insultos = require('./insultos.json');
const blacklist = insultos.palabras;

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

  const msg = message.content.toLowerCase().replace(/[^a-z0-9]/gi, '');
  const bad = blacklist.some(p => msg.includes(p));

  // 🚫 FILTRO DE INSULTOS
  if (bad) {
    if (!warns[message.author.id]) warns[message.author.id] = 0;

    warns[message.author.id]++;
    saveWarns();

    let texto = `⚠ ${message.author} tiene ${warns[message.author.id]}/3 advertencias`;

    // 🔥 BORRAR MENSAJE
    try {
      await message.delete();
    } catch (err) {
      console.log("No pude borrar el mensaje");
    }

    if (warns[message.author.id] >= 3) {
      const member = await message.guild.members.fetch(message.author.id);

      try {
        await member.kick();
        warns[message.author.id] = 0;
        texto += `\n👢 Expulsado por insultar demasiado`;
      } catch (err) {
        console.error(err);
        texto += `\n❌ No pude expulsarlo (revisa permisos)`;
      }
    }

    return message.channel.send(texto);
  }

  // 🎮 NIVELES
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
    switch (interaction.commandName) {

      case "ping":
        return interaction.reply("🏓 Pong!");

      case "nivel": {
        const data = levels.get(interaction.user.id) || { xp: 0, level: 1 };
        return interaction.reply(`📊 Nivel ${data.level} | XP ${data.xp}`);
      }

      case "help":
        return interaction.reply(
          "📌 Comandos:\n" +
          "ping, nivel, ban, kick, warn, warns, clear, rol, quitar, invite"
        );

      case "invite": {
        const link = `https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
        return interaction.reply(`🔗 Invita el bot:\n${link}`);
      }

      // ================= ROLES =================

      case "rol": {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageRoles))
          return interaction.reply({ content: "❌ Sin permisos", ephemeral: true });

        const user = interaction.options.getUser("usuario");
        const tipo = interaction.options.getString("tipo");

        const member = await interaction.guild.members.fetch(user.id);

        const role = interaction.guild.roles.cache.find(r =>
          r.name.toLowerCase().includes(tipo)
        );

        if (!role) return interaction.reply("❌ Rol no encontrado");

        if (role.position >= interaction.guild.members.me.roles.highest.position)
          return interaction.reply("❌ El rol es más alto que el bot");

        await member.roles.add(role);

        return interaction.reply(`✅ Rol ${role.name} dado a ${user.tag}`);
      }

      case "quitar": {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageRoles))
          return interaction.reply({ content: "❌ Sin permisos", ephemeral: true });

        const user = interaction.options.getUser("usuario");
        const role = interaction.options.getRole("roleo");

        const member = await interaction.guild.members.fetch(user.id);
        const bot = interaction.guild.members.me;

        if (role.position >= bot.roles.highest.position)
          return interaction.reply("❌ Ese rol es más alto que el bot");

        if (!member.roles.cache.has(role.id))
          return interaction.reply(`❌ ${user.tag} no tiene ese rol`);

        await member.roles.remove(role);

        return interaction.reply(`🧹 Rol ${role.name} quitado a ${user.tag}`);
      }

      // ================= MODERACION =================

      case "ban": {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.BanMembers))
          return interaction.reply({ content: "❌ Sin permisos", ephemeral: true });

        const user = interaction.options.getUser("usuario");
        const member = await interaction.guild.members.fetch(user.id);

        await member.ban();

        return interaction.reply(`🔨 ${user.tag} baneado`);
      }

      case "kick": {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.KickMembers))
          return interaction.reply({ content: "❌ Sin permisos", ephemeral: true });

        const user = interaction.options.getUser("usuario");
        const member = await interaction.guild.members.fetch(user.id);

        await member.kick();

        return interaction.reply(`👢 ${user.tag} expulsado`);
      }

      case "clear": {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageMessages))
          return interaction.reply({ content: "❌ Sin permisos", ephemeral: true });

        const cantidad = interaction.options.getInteger("cantidad");

        await interaction.channel.bulkDelete(cantidad, true);

        return interaction.reply({
          content: `🧹 ${cantidad} mensajes eliminados`,
          ephemeral: true
        });
      }

      // ================= WARN =================

      case "warn": {
        const user = interaction.options.getUser("usuario");

        if (!warns[user.id]) warns[user.id] = 0;
        warns[user.id]++;

        saveWarns();

        return interaction.reply(`⚠️ ${user.tag} tiene ${warns[user.id]} advertencias`);
      }

      case "warns": {
        const user = interaction.options.getUser("usuario");
        const cantidad = warns[user.id] || 0;

        return interaction.reply(`📋 ${user.tag} tiene ${cantidad} advertencias`);
      }

    }

  } catch (err) {
    console.error(err);
    return interaction.reply({ content: "❌ Error ejecutando comando", ephemeral: true });
  }
});

// ================= LOGIN =================
client.login(process.env.TOKEN);
