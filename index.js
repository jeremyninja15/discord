const {
  Client,
  GatewayIntentBits,
  PermissionsBitField
} = require('discord.js');

const axios = require('axios');
const fs = require('fs');

const insultos = require('./insultos.json');
const blacklist = insultos.palabras;
const { Client: NekosClient } = require("nekos-best.js");
const nekos = new NekosClient();

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

if (fs.existsSync('./advertencias.json')) {
  warns = JSON.parse(fs.readFileSync('./advertencias.json'));
}

function saveWarns() {
  fs.writeFileSync('./advertencias.json', JSON.stringify(warns, null, 2));
}

// cooldown NSFW
const cooldown = new Map();

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
    try {
      await message.delete();
    } catch {}

    if (!warnedTemp.has(message.author.id)) {
      warnedTemp.set(message.author.id, true);

      const aviso = await message.channel.send(
        `⚠ ${message.author} evita insultos.\n❗ Próxima será advertencia real.`
      );

      setTimeout(() => aviso.delete().catch(() => {}), 15000);
      return;
    }

    warnedTemp.delete(message.author.id);

    if (!warns[message.author.id]) warns[message.author.id] = 0;

    warns[message.author.id]++;
    saveWarns();

    let texto = `⚠ ${message.author} tiene ${warns[message.author.id]}/3 advertencias`;

    if (warns[message.author.id] >= 3) {
      try {
        const member = await message.guild.members.fetch(message.author.id);
        await member.kick();
        warns[message.author.id] = 0;
        texto += `\n👢 Expulsado`;
      } catch {
        texto += `\n❌ Error al expulsar`;
      }
    }

    return message.channel.send(texto);
  }

  // NIVELES
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
          "📌 ping, nivel, ban, kick, warn, warns, clear, rol, quitar, invite, hentai"
        );

      case "invite": {
        const link = `https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
        return interaction.reply(`🔗 ${link}`);
      }

      // ================= ROLES =================

      case "rol": {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageRoles))
          return interaction.reply({ content: "❌ Sin permisos", flags: 64 });

        const user = interaction.options.getUser("usuario");
        const tipo = interaction.options.getString("tipo");

        const member = await interaction.guild.members.fetch(user.id);

        const role = interaction.guild.roles.cache.find(r =>
          r.name.toLowerCase().includes(tipo)
        );

        if (!role) return interaction.reply({ content: "❌ Rol no encontrado", flags: 64 });

        if (role.position >= interaction.guild.members.me.roles.highest.position)
          return interaction.reply({ content: "❌ Rol más alto que el bot", flags: 64 });

        await member.roles.add(role);

        return interaction.reply(`✅ Rol ${role.name} dado a ${user.tag}`);
      }

      case "quitar": {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageRoles))
          return interaction.reply({ content: "❌ Sin permisos", flags: 64 });

        const user = interaction.options.getUser("usuario");
        const role = interaction.options.getRole("roleo");

        const member = await interaction.guild.members.fetch(user.id);

        if (!member.roles.cache.has(role.id))
          return interaction.reply(`❌ No tiene ese rol`);

        await member.roles.remove(role);

        return interaction.reply(`🧹 Rol quitado a ${user.tag}`);
      }

      // ================= MODERACION =================

      case "ban": {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.BanMembers))
          return interaction.reply({ content: "❌ Sin permisos", flags: 64 });

        const user = interaction.options.getUser("usuario");
        const member = await interaction.guild.members.fetch(user.id);

        await member.ban();
        return interaction.reply(`🔨 ${user.tag} baneado`);
      }

      case "kick": {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.KickMembers))
          return interaction.reply({ content: "❌ Sin permisos", flags: 64 });

        const user = interaction.options.getUser("usuario");
        const member = await interaction.guild.members.fetch(user.id);

        await member.kick();
        return interaction.reply(`👢 ${user.tag} expulsado`);
      }

      case "clear": {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageMessages))
          return interaction.reply({ content: "❌ Sin permisos", flags: 64 });

        const cantidad = interaction.options.getInteger("cantidad");

        await interaction.channel.bulkDelete(cantidad, true);

        return interaction.reply({
          content: `🧹 ${cantidad} mensajes eliminados`,
          flags: 64
        });
      }

      // ================= NSFW =================


        case "hentai": {

  if (!interaction.channel.nsfw) {
    return interaction.reply({
      content: "❌ Solo NSFW",
      flags: 64
    });
  }

  try {

    const res = await axios.get(
      "https://nekos.best/api/v2/hentai",
      { timeout: 8000 }
    );

    const url = res.data?.results?.[0]?.url;

    if (!url) {
      return interaction.reply({
        content: "❌ API respondió vacío",
        flags: 64
      });
    }

    return interaction.reply({ content: url });

  } catch (err) {
    console.log("❌ ERROR REAL API:", err.message);

    return interaction.reply({
      content: "❌ API caída o bloqueada (revisar logs)",
      flags: 64
    });
  }
        }
        

      // ================= WARN =================

      case "warn": {
        const user = interaction.options.getUser("usuario");

        if (!warns[user.id]) warns[user.id] = 0;
        warns[user.id]++;
        saveWarns();

        return interaction.reply(`⚠ ${user.tag} tiene ${warns[user.id]}`);
      }

      case "warns": {
        const user = interaction.options.getUser("usuario");
        return interaction.reply(`📋 ${warns[user.id] || 0} advertencias`);
      }

    }

  } catch (err) {
    console.error(err);
    return interaction.reply({ content: "❌ Error", flags: 64 });
  }
});

// ================= LOGIN =================
client.login(process.env.TOKEN);
