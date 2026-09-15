const {
  Client,
  GatewayIntentBits,
  PermissionsBitField
} = require("discord.js");

const fs = require("fs");

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

const insultos = require("./insultos.json");

const blacklist = Array.isArray(insultos.palabras)
  ? insultos.palabras.map(p => String(p).toLowerCase())
  : [];

// ================= STORAGE =================

let warns = {};

const levels = new Map();
const warnedTemp = new Map();

if (fs.existsSync("./advertencias.json")) {
  try {
    warns = JSON.parse(
      fs.readFileSync("./advertencias.json", "utf8")
    );
  } catch (err) {
    console.error(
      "❌ Error leyendo advertencias.json:",
      err.message
    );

    warns = {};
  }
}

function saveWarns() {
  try {
    fs.writeFileSync(
      "./advertencias.json",
      JSON.stringify(warns, null, 2)
    );
  } catch (err) {
    console.error(
      "❌ Error guardando advertencias:",
      err.message
    );
  }
}

// ================= READY =================

client.once("clientReady", () => {
  console.log(`🔥 ${client.user.tag} activo`);
  console.log(`🏠 Servidores: ${client.guilds.cache.size}`);
});

// ================= MENSAJES =================

client.on("messageCreate", async message => {
  if (!message.guild || message.author.bot) {
    return;
  }

  try {

    // ================= FILTRO DE INSULTOS =================

    const msg = message.content
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúñü]/gi, "");

    const bad = blacklist.some(p =>
      msg.includes(p)
    );

    if (bad) {

      // Intentar borrar mensaje
      try {
        await message.delete();
      } catch (err) {
        console.log(
          "⚠️ No se pudo borrar el mensaje:",
          err.message
        );
      }

      // Primera advertencia temporal
      if (!warnedTemp.has(message.author.id)) {

        warnedTemp.set(
          message.author.id,
          true
        );

        try {

          const aviso =
            await message.channel.send(
              `⚠️ ${message.author} evita los insultos`
            );

          setTimeout(() => {
            aviso.delete().catch(() => {});
          }, 15000);

        } catch (err) {
          console.error(
            "❌ Error enviando aviso:",
            err.message
          );
        }

        return;
      }

      // Segunda vez
      warnedTemp.delete(
        message.author.id
      );

      warns[message.author.id] =
        (warns[message.author.id] || 0) + 1;

      saveWarns();

      const cantidad =
        warns[message.author.id];

      try {

        const aviso =
          await message.channel.send(
            `⚠️ ${message.author} tiene ${cantidad}/3 advertencias`
          );

        setTimeout(() => {
          aviso.delete().catch(() => {});
        }, 15000);

      } catch {}

      // Tres advertencias = kick
      if (cantidad >= 3) {

        try {

          const member =
            await message.guild.members.fetch(
              message.author.id
            );

          const bot =
            message.guild.members.me;

          if (!bot) {
            console.log(
              "❌ No pude obtener al bot como miembro"
            );
          } else if (
            !bot.permissions.has(
              PermissionsBitField.Flags.KickMembers
            )
          ) {
            console.log(
              "❌ El bot no tiene permiso KickMembers"
            );
          } else if (
            member.id === message.guild.ownerId
          ) {
            console.log(
              "❌ No se puede expulsar al dueño del servidor"
            );
          } else if (
            member.roles.highest.position >=
            bot.roles.highest.position
          ) {
            console.log(
              "❌ No se puede expulsar a este usuario por jerarquía de roles"
            );
          } else {

            await member.kick(
              "3 advertencias por insultos"
            );

            warns[message.author.id] = 0;
            saveWarns();

            try {
              await message.channel.send(
                `👢 ${message.author.tag} fue expulsado por acumular 3 advertencias.`
              );
            } catch {}
          }

        } catch (err) {

          console.error(
            "❌ Error al expulsar:",
            err.message
          );
        }
      }

      return;
    }

    // ================= SISTEMA DE NIVELES =================

    const data =
      levels.get(message.author.id) || {
        xp: 0,
        level: 1
      };

    data.xp += 10;

    const xpNecesaria =
      data.level * 100;

    if (data.xp >= xpNecesaria) {

      data.xp -= xpNecesaria;
      data.level++;

      try {
        await message.channel.send(
          `🎉 ${message.author} subió a nivel ${data.level}`
        );
      } catch {}
    }

    levels.set(
      message.author.id,
      data
    );

  } catch (err) {

    console.error(
      "❌ Error en messageCreate:",
      err
    );
  }
});

// ================= INTERACCIONES =================

client.on(
  "interactionCreate",
  async interaction => {

    if (!interaction.isChatInputCommand()) {
      return;
    }

    try {

      console.log(
        `📥 /${interaction.commandName} recibido`
      );

      // ================= PING =================

      if (
        interaction.commandName === "ping"
      ) {

        return await interaction.reply(
          "🏓 Pong!"
        );
      }

      // ================= NIVEL =================

      if (
        interaction.commandName === "nivel"
      ) {

        const data =
          levels.get(interaction.user.id) || {
            xp: 0,
            level: 1
          };

        return await interaction.reply(
          `📊 Nivel ${data.level} | XP ${data.xp}`
        );
      }

      // ================= HELP =================

      if (
        interaction.commandName === "help"
      ) {

        return await interaction.reply(
          "📌 Comandos disponibles:\n\n" +
          "🏓 `/ping` — Verificar bot\n" +
          "📊 `/nivel` — Ver tu nivel\n" +
          "⚠️ `/warn` — Advertir usuario\n" +
          "📋 `/warns` — Ver advertencias\n" +
          "🔨 `/ban` — Banear usuario\n" +
          "👢 `/kick` — Expulsar usuario\n" +
          "🧹 `/clear` — Borrar mensajes\n" +
          "👥 `/rol` — Asignar rol\n" +
          "🧹 `/quitar` — Quitar rol\n" +
          "🔗 `/invite` — Invitar el bot"
        );
      }

      // ================= INVITE =================

      if (
        interaction.commandName === "invite"
      ) {

        const clientId =
          process.env.CLIENT_ID;

        if (!clientId) {

          return await interaction.reply({
            content:
              "❌ Falta CLIENT_ID en las variables de entorno.",
            ephemeral: true
          });
        }

        const invite =
          `https://discord.com/oauth2/authorize` +
          `?client_id=${clientId}` +
          `&permissions=8` +
          `&scope=bot%20applications.commands`;

        return await interaction.reply(
          `🔗 Invita el bot:\n${invite}`
        );
      }

      // ================= WARN =================

      if (
        interaction.commandName === "warn"
      ) {

        if (
          !interaction.memberPermissions?.has(
            PermissionsBitField.Flags.ModerateMembers
          )
        ) {

          return await interaction.reply({
            content:
              "❌ No tienes permisos para advertir usuarios.",
            ephemeral: true
          });
        }

        const user =
          interaction.options.getUser(
            "usuario"
          );

        if (!user) {

          return await interaction.reply({
            content:
              "❌ Usuario no encontrado.",
            ephemeral: true
          });
        }

        warns[user.id] =
          (warns[user.id] || 0) + 1;

        saveWarns();

        return await interaction.reply(
          `⚠️ ${user.tag} tiene ${warns[user.id]}/3 advertencias`
        );
      }

      // ================= WARNS =================

      if (
        interaction.commandName === "warns"
      ) {

        const user =
          interaction.options.getUser(
            "usuario"
          );

        if (!user) {

          return await interaction.reply({
            content:
              "❌ Usuario no encontrado.",
            ephemeral: true
          });
        }

        return await interaction.reply(
          `📋 ${user.tag} tiene ${warns[user.id] || 0}/3 advertencias`
        );
      }

      // ================= BAN =================

      if (
        interaction.commandName === "ban"
      ) {

        if (
          !interaction.memberPermissions?.has(
            PermissionsBitField.Flags.BanMembers
          )
        ) {

          return await interaction.reply({
            content:
              "❌ No tienes permiso para banear.",
            ephemeral: true
          });
        }

        const user =
          interaction.options.getUser(
            "usuario"
          );

        if (!user) {

          return await interaction.reply({
            content:
              "❌ Usuario no encontrado.",
            ephemeral: true
          });
        }

        const member =
          await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        const bot =
          interaction.guild.members.me;

        if (!member) {

          return await interaction.reply(
            "❌ No pude encontrar al usuario en el servidor."
          );
        }

        if (!bot) {

          return await interaction.reply(
            "❌ No pude obtener al bot en el servidor."
          );
        }

        if (
          member.id ===
          interaction.guild.ownerId
        ) {

          return await interaction.reply(
            "❌ No puedes banear al dueño del servidor."
          );
        }

        if (
          member.roles.highest.position >=
          bot.roles.highest.position
        ) {

          return await interaction.reply(
            "❌ No puedo banear a este usuario porque su rol es igual o superior al mío."
          );
        }

        try {

          await member.ban({
            reason:
              "Baneado mediante comando /ban"
          });

          return await interaction.reply(
            `🔨 ${user.tag} fue baneado.`
          );

        } catch (err) {

          console.error(
            "❌ Error al banear:",
            err
          );

          return await interaction.reply(
            "❌ No pude banear al usuario."
          );
        }
      }

      // ================= KICK =================

      if (
        interaction.commandName === "kick"
      ) {

        if (
          !interaction.memberPermissions?.has(
            PermissionsBitField.Flags.KickMembers
          )
        ) {

          return await interaction.reply({
            content:
              "❌ No tienes permiso para expulsar.",
            ephemeral: true
          });
        }

        const user =
          interaction.options.getUser(
            "usuario"
          );

        if (!user) {

          return await interaction.reply({
            content:
              "❌ Usuario no encontrado.",
            ephemeral: true
          });
        }

        const member =
          await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        const bot =
          interaction.guild.members.me;

        if (!member) {

          return await interaction.reply(
            "❌ No pude encontrar al usuario en el servidor."
          );
        }

        if (!bot) {

          return await interaction.reply(
            "❌ No pude obtener al bot en el servidor."
          );
        }

        if (
          member.id ===
          interaction.guild.ownerId
        ) {

          return await interaction.reply(
            "❌ No puedes expulsar al dueño del servidor."
          );
        }

        if (
          member.roles.highest.position >=
          bot.roles.highest.position
        ) {

          return await interaction.reply(
            "❌ No puedo expulsar a este usuario porque su rol es igual o superior al mío."
          );
        }

        try {

          await member.kick(
            "Expulsado mediante comando /kick"
          );

          return await interaction.reply(
            `👢 ${user.tag} fue expulsado.`
          );

        } catch (err) {

          console.error(
            "❌ Error al expulsar:",
            err
          );

          return await interaction.reply(
            "❌ No pude expulsar al usuario."
          );
        }
      }

      // ================= CLEAR =================

      if (
        interaction.commandName === "clear"
      ) {

        if (
          !interaction.memberPermissions?.has(
            PermissionsBitField.Flags.ManageMessages
          )
        ) {

          return await interaction.reply({
            content:
              "❌ No tienes permiso para borrar mensajes.",
            ephemeral: true
          });
        }

        const cantidad =
          interaction.options.getInteger(
            "cantidad"
          );

        if (
          !cantidad ||
          cantidad < 1 ||
          cantidad > 100
        ) {

          return await interaction.reply({
            content:
              "❌ La cantidad debe estar entre 1 y 100.",
            ephemeral: true
          });
        }

        try {

          const mensajes =
            await interaction.channel.bulkDelete(
              cantidad,
              true
            );

          return await interaction.reply({
            content:
              `🧹 Se eliminaron ${mensajes.size} mensajes.`,
            ephemeral: true
          });

        } catch (err) {

          console.error(
            "❌ Error en clear:",
            err
          );

          return await interaction.reply({
            content:
              "❌ No pude borrar los mensajes.",
            ephemeral: true
          });
        }
      }

      // ================= ROL =================

      if (
        interaction.commandName === "rol"
      ) {

        if (
          !interaction.memberPermissions?.has(
            PermissionsBitField.Flags.ManageRoles
          )
        ) {

          return await interaction.reply({
            content:
              "❌ No tienes permiso para gestionar roles.",
            ephemeral: true
          });
        }

        const user =
          interaction.options.getUser(
            "usuario"
          );

        const tipo =
          interaction.options.getString(
            "tipo"
          );

        if (!user || !tipo) {

          return await interaction.reply({
            content:
              "❌ Faltan datos.",
            ephemeral: true
          });
        }

        const member =
          await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        const bot =
          interaction.guild.members.me;

        if (!member || !bot) {

          return await interaction.reply(
            "❌ No pude encontrar al usuario o al bot."
          );
        }

        let roleName;

        if (tipo === "mod") {
          roleName = "Mod";
        } else if (tipo === "admin") {
          roleName = "Admin";
        } else {
          return await interaction.reply(
            "❌ Tipo de rol inválido."
          );
        }

        const role =
          interaction.guild.roles.cache.find(
            r =>
              r.name.toLowerCase() ===
              roleName.toLowerCase()
          );

        if (!role) {

          return await interaction.reply(
            `❌ No existe el rol ${roleName}.`
          );
        }

        if (
          role.position >=
          bot.roles.highest.position
        ) {

          return await interaction.reply(
            "❌ Ese rol está por encima o al mismo nivel que el rol del bot."
          );
        }

        try {

          await member.roles.add(role);

          return await interaction.reply(
            `✅ Rol **${role.name}** asignado a ${user.tag}.`
          );

        } catch (err) {

          console.error(
            "❌ Error asignando rol:",
            err
          );

          return await interaction.reply(
            "❌ No pude asignar el rol."
          );
        }
      }

      // ================= QUITAR =================

      if (
        interaction.commandName === "quitar"
      ) {

        if (
          !interaction.memberPermissions?.has(
            PermissionsBitField.Flags.ManageRoles
          )
        ) {

          return await interaction.reply({
            content:
              "❌ No tienes permiso para gestionar roles.",
            ephemeral: true
          });
        }

        const user =
          interaction.options.getUser(
            "usuario"
          );

        const role =
          interaction.options.getRole(
            "roleo"
          );

        if (!user || !role) {

          return await interaction.reply({
            content:
              "❌ Faltan datos.",
            ephemeral: true
          });
        }

        const member =
          await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        const bot =
          interaction.guild.members.me;

        if (!member || !bot) {

          return await interaction.reply(
            "❌ No pude encontrar al usuario o al bot."
          );
        }

        if (
          member.id ===
          interaction.guild.ownerId
        ) {

          return await interaction.reply(
            "❌ No puedes quitar roles al dueño del servidor."
          );
        }

        if (
          role.position >=
          bot.roles.highest.position
        ) {

          return await interaction.reply(
            "❌ Ese rol está por encima o al mismo nivel que el rol del bot."
          );
        }

        if (
          !member.roles.cache.has(
            role.id
          )
        ) {

          return await interaction.reply(
            `❌ ${user.tag} no tiene ese rol.`
          );
        }

        try {

          await member.roles.remove(
            role
          );

          return await interaction.reply(
            `🧹 Rol **${role.name}** quitado a ${user.tag}.`
          );

        } catch (err) {

          console.error(
            "❌ Error quitando rol:",
            err
          );

          return await interaction.reply(
            "❌ No pude quitar el rol."
          );
        }
      }

      // ================= DESCONOCIDO =================

      return await interaction.reply({
        content:
          "❌ Comando no reconocido.",
        ephemeral: true
      });

    } catch (err) {

      console.error(
        `❌ Error en /${interaction.commandName}:`,
        err
      );

      // Evita responder dos veces
      try {

        if (
          interaction.replied ||
          interaction.deferred
        ) {

          await interaction.editReply(
            "❌ Ocurrió un error al ejecutar el comando."
          );

        } else {

          await interaction.reply({
            content:
              "❌ Ocurrió un error al ejecutar el comando.",
            ephemeral: true
          });

        }

      } catch (replyError) {

        console.error(
          "❌ No se pudo enviar el mensaje de error:",
          replyError.message
        );
      }
    }
  }
);

// ================= LOGIN =================

if (!process.env.TOKEN) {

  console.error(
    "❌ Falta la variable TOKEN."
  );

  process.exit(1);
}

client.login(process.env.TOKEN);
