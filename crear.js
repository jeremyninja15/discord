const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
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

// ================= FUNCIONES PRO =================
function getRazonNoAccion(member, bot, accion) {
  let razones = [];

  if (member.id === member.guild.ownerId) {
    razones.push("👑 Es el creador del servidor");
  }

  if (member.roles.highest.position >= bot.roles.highest.position) {
    razones.push("🔝 Tiene un rol más alto o igual que el bot");
  }

  if (accion === "kick" && !bot.permissions.has(PermissionsBitField.Flags.KickMembers)) {
    razones.push("🚫 El bot no tiene permisos para expulsar");
  }

  if (accion === "ban" && !bot.permissions.has(PermissionsBitField.Flags.BanMembers)) {
    razones.push("🚫 El bot no tiene permisos para banear");
  }

  return razones;
}

async function quitarRolesPeligrosos(member, bot) {
  const roles = member.roles.cache.filter(r =>
    r.permissions.has(PermissionsBitField.Flags.Administrator) ||
    r.permissions.has(PermissionsBitField.Flags.KickMembers) ||
    r.permissions.has(PermissionsBitField.Flags.BanMembers)
  );

  for (const role of roles.values()) {
    if (role.position < bot.roles.highest.position) {
      await member.roles.remove(role);
    }
  }
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

    let texto = `⚠ ${message.author.tag} tiene ${warns[message.author.id]}/3 advertencias`;

    if (warns[message.author.id] >= 3) {
      const member = message.guild.members.cache.get(message.author.id);
      const bot = message.guild.members.me;

      if (member) {
        const razones = getRazonNoAccion(member, bot, "kick");

        if (razones.length > 0) {
          return message.reply(`❌ No puedo castigar a ${message.author.tag} porque:\n${razones.join("\n")}`);
        }

        await quitarRolesPeligrosos(member, bot);

        if (!strikes[message.author.id]) {
          await member.kick();
          strikes[message.author.id] = true;
          warns[message.author.id] = 0;
          texto += `\n👢 Expulsado`;
        } else {
          await member.ban();
          warns[message.author.id] = 0;
          texto += `\n🔨 Baneado`;
        }
      }
    }

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

// ================= COMANDOS =================
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const bot = interaction.guild.members.me;

  switch (interaction.commandName) {

    case "ping":
      return interaction.reply("🏓 Pong!");

    case "help":
      return interaction.reply({
        content: `/ping /nivel /warn /warns /ban /kick /clear /imagen /rol /quitar`,
        ephemeral: true
      });

      case "invite":
  return interaction.reply({
    content: `🔗 https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot%20applications.commands`,
    ephemeral: true
  });

    case "nivel": {
      const data = levels.get(interaction.user.id) || { xp: 0, level: 1 };
      return interaction.reply(`📊 Nivel ${data.level} | XP ${data.xp}`);
    }

    case "warn": {
      const user = interaction.options.getUser("usuario");
      if (!warns[user.id]) warns[user.id] = 0;
      warns[user.id]++;
      saveWarns();
      return interaction.reply(`⚠ ${user.tag} tiene ${warns[user.id]} advertencias`);
    }

    case "warns": {
      const user = interaction.options.getUser("usuario");
      return interaction.reply(`📋 ${user.tag} tiene ${warns[user.id] || 0} advertencias`);
    }

    case "clear": {
      const cantidad = interaction.options.getInteger("cantidad");
      await interaction.channel.bulkDelete(cantidad, true);
      return interaction.reply(`🧹 ${cantidad} mensajes eliminados`);
    }

    case "imagen": {
      const prompt = interaction.options.getString("prompt");
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;

      const embed = new EmbedBuilder()
        .setColor("Purple")
        .setTitle("🖼 Imagen generada")
        .setImage(url);

      return interaction.reply({ embeds: [embed] });
    }

    case "rol": {
      const user = interaction.options.getUser("usuario");
      const tipo = interaction.options.getString("tipo");
      const member = interaction.guild.members.cache.get(user.id);

      let role = interaction.guild.roles.cache.find(r => r.name.toLowerCase().includes(tipo));

      if (!role) return interaction.reply("❌ Rol no encontrado");

      await member.roles.add(role);
      return interaction.reply(`✅ ${user.tag} ahora es ${tipo}`);
    }

    case "quitar": {
  const user = interaction.options.getUser("usuario");
  const rolNombre = interaction.options.getString("rol");
  const member = interaction.guild.members.cache.get(user.id);
  const bot = interaction.guild.members.me;

  if (!member)
    return interaction.reply("❌ Usuario no encontrado");

  // 🔍 Obtener roles del usuario (sin @everyone)
  const rolesUsuario = member.roles.cache.filter(r => r.name !== "@everyone");

  // ❗ Si no puso rol → mostrar lista
  if (!rolNombre) {
    if (rolesUsuario.size === 0) {
      return interaction.reply(`❌ ${user.tag} no tiene roles para quitar`);
    }

    const lista = rolesUsuario.map(r => `• ${r.name}`).join("\n");

    return interaction.reply({
      content: `📋 Roles de **${user.tag}**:\n${lista}\n\n✏ Usa: /quitar usuario:${user.username} rol:nombre`,
      ephemeral: true
    });
  }

  // 🔎 Buscar rol por nombre
  const rol = rolesUsuario.find(r => r.name.toLowerCase().includes(rolNombre.toLowerCase()));

  if (!rol)
    return interaction.reply(`❌ ${user.tag} no tiene ese rol`);

  // ⚠️ Verificar jerarquía
  if (rol.position >= bot.roles.highest.position) {
    return interaction.reply(`❌ No puedo quitar el rol **${rol.name}** porque es más alto que el bot`);
  }

  try {
    await member.roles.remove(rol);
    return interaction.reply(`🧹 Rol **${rol.name}** eliminado a ${user.tag}`);
  } catch (err) {
    console.error(err);
    return interaction.reply(`❌ Error al quitar el rol`);
  }
    }

    case "kick": {
      const user = interaction.options.getUser("usuario");
      const member = interaction.guild.members.cache.get(user.id);

      const razones = getRazonNoAccion(member, bot, "kick");
      if (razones.length > 0)
        return interaction.reply(`❌ No puedo expulsar a ${user.tag} porque:\n${razones.join("\n")}`);

      await quitarRolesPeligrosos(member, bot);
      await member.kick();

      return interaction.reply(`👢 ${user.tag} expulsado`);
    }

    case "ban": {
      const user = interaction.options.getUser("usuario");
      const member = interaction.guild.members.cache.get(user.id);

      const razones = getRazonNoAccion(member, bot, "ban");
      if (razones.length > 0)
        return interaction.reply(`❌ No puedo banear a ${user.tag} porque:\n${razones.join("\n")}`);

      await quitarRolesPeligrosos(member, bot);
      await member.ban();

      return interaction.reply(`🔨 ${user.tag} baneado`);
    }

  }
});

// ================= LOGIN =================
client.login(process.env.TOKEN);
