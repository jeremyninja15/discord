const {
  Client,
  GatewayIntentBits,
  PermissionsBitField
} = require("discord.js");

const fs = require("fs");

// =====================================================
// CLIENT
// =====================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

// =====================================================
// DATOS
// =====================================================

const insultos = require("./insultos.json");

const blacklist = Array.isArray(insultos.palabras)
  ? insultos.palabras.map(p =>
      String(p).toLowerCase()
    )
  : [];

// =====================================================
// STORAGE
// =====================================================

let warns = {};

const levels = new Map();
const warnedTemp = new Map();

if (fs.existsSync("./advertencias.json")) {
  try {
    warns = JSON.parse(
      fs.readFileSync(
        "./advertencias.json",
        "utf8"
      )
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

// =====================================================
// FUNCIONES
// =====================================================

function tienePermiso(interaction, permiso) {
  return interaction.memberPermissions?.has(
    permiso
  );
}

function puedeModerar(member, botMember) {
  if (!member || !botMember) {
    return false;
  }

  // No se puede moderar al dueño
  if (
    member.guild.ownerId === member.id
  ) {
    return false;
  }

  // El bot debe estar por encima
  if (
    member.roles.highest.position >=
    botMember.roles.highest.position
  ) {
    return false;
  }

  return true;
}

// =====================================================
// READY
// =====================================================

client.once("clientReady", () => {
  console.log(
    `🔥 ${client.user.tag} activo`
  );

  console.log(
    `🏠 Servidores: ${client.guilds.cache.size}`
  );
});

// =====================================================
// MENSAJES
// =====================================================

client.on(
  "messageCreate",
  async message => {

    if (
      !message.guild ||
      message.author.bot
    ) {
      return;
    }

    try {

      // =================================================
      // FILTRO DE INSULTOS
      // =================================================

      const msg =
        message.content
          .toLowerCase()
          .replace(
            /[^a-z0-9áéíóúñü]/gi,
            ""
          );

      const bad =
        blacklist.some(p =>
          msg.includes(p)
        );

      if (bad) {

        // Intentar borrar
        try {
          await message.delete();
        } catch (err) {
          console.log(
            "⚠️ No se pudo borrar el mensaje:",
            err.message
          );
        }

        // Primera advertencia temporal
        if (
          !warnedTemp.has(
            message.author.id
          )
        ) {

          warnedTemp.set(
            message.author.id,
            true
          );

          try {

            const aviso =
              await message.channel.send(
                `⚠️ ${message.author} evita los insultos.`
              );

            setTimeout(() => {
              aviso.delete().catch(
                () => {}
              );
            }, 15000);

          } catch (err) {
            console.error(
              "❌ Error enviando aviso:",
              err.message
            );
          }

          return;
        }

        // Segunda detección
        warnedTemp.delete(
          message.author.id
        );

        warns[message.author.id] =
          (warns[message.author.id] || 0) +
          1;

        saveWarns();

        const cantidad =
          warns[message.author.id];

        try {

          const aviso =
            await message.channel.send(
              `⚠️ ${message.author} tiene ${cantidad}/3 advertencias.`
            );

          setTimeout(() => {
            aviso.delete().catch(
              () => {}
            );
          }, 15000);

        } catch {}

        // =================================================
        // 3 WARNS = KICK
        // =================================================

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
                "❌ No se encontró el miembro del bot."
              );

            } else if (
              !bot.permissions.has(
                PermissionsBitField.Flags.KickMembers
              )
            ) {
              console.log(
                "❌ El bot no tiene KickMembers."
              );

            } else if (
              !puedeModerar(
                member,
                bot
              )
            ) {
              console.log(
                "❌ El bot no puede expulsar a este usuario."
              );

            } else {

              await member.kick(
                "3 advertencias por insultos"
              );

              warns[message.author.id] = 0;

              saveWarns();

              await message.channel.send(
                `👢 ${message.author.tag} fue expulsado por acumular 3 advertencias.`
              );
            }

          } catch (err) {

            console.error(
              "❌ Error ejecutando kick automático:",
              err.message
            );
          }
        }

        return;
      }

      // =================================================
      // SISTEMA DE NIVELES
      // =================================================

      const data =
        levels.get(
          message.author.id
        ) || {
          xp: 0,
          level: 1
        };

      data.xp += 10;

      const xpNecesaria =
        data.level * 100;

      if (
        data.xp >= xpNecesaria
      ) {

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
  }
);

// =====================================================
// INTERACCIONES
// =====================================================

client.on(
  "interactionCreate",
  async interaction => {

    if (
      !interaction.isChatInputCommand()
    ) {
      return;
    }

    console.log(
      `📥 /${interaction.commandName} recibido`
    );

    try {

      // =================================================
      // PING
      // =================================================

      if (
        interaction.commandName ===
        "ping"
      ) {

        return await interaction.reply(
          "🏓 Pong!"
        );
      }

      // =================================================
      // NIVEL
      // =================================================

      if (
        interaction.commandName ===
        "nivel"
      ) {

        const data =
          levels.get(
            interaction.user.id
          ) || {
            xp: 0,
            level: 1
          };

        return await interaction.reply(
          `📊 Nivel ${data.level} | XP ${data.xp}`
        );
      }

      // =================================================
      // HELP
      // =================================================

      if (
        interaction.commandName ===
        "help"
      ) {

        return await interaction.reply(
          "📌 **Comandos disponibles**\n\n" +

          "🏓 `/ping`\n" +
          "📊 `/nivel`\n" +
          "⚠️ `/warn`\n" +
          "📋 `/warns`\n" +
          "🔨 `/ban`\n" +
          "👢 `/kick`\n" +
          "🧹 `/clear`\n" +
          "👤 `/rol`\n" +
          "🧹 `/quitar`\n" +
          "🔗 `/invite`\n" +
          "🔞 `/hentai`\n" +
          "🔞 `/nsfw`"
        );
      }

      // =================================================
      // INVITE
      // =================================================

      if (
        interaction.commandName ===
        "invite"
      ) {

        if (!process.env.CLIENT_ID) {

          return await interaction.reply({
            content:
              "❌ Falta CLIENT_ID.",
            ephemeral: true
          });
        }

        const invite =
          "https://discord.com/oauth2/authorize" +
          `?client_id=${process.env.CLIENT_ID}` +
          "&permissions=8" +
          "&scope=bot%20applications.commands";

        return await interaction.reply(
          `🔗 **Invita el bot:**\n${invite}`
        );
      }

      // =================================================
      // HENTAI
      // =================================================

      if (
        interaction.commandName ===
        "hentai"
      ) {

        if (
          !interaction.channel?.nsfw
        ) {

          return await interaction.reply({
            content:
              "❌ Este comando solamente puede utilizarse en un canal marcado como NSFW.",
            ephemeral: true
          });
        }

        const tag =
          interaction.options.getString(
            "tag"
          ) || "neko";

        return await interaction.reply(
          `🔞 Comando /hentai recibido.\n🏷️ Tag: \`${tag}\`\n\n` +
          "El comando está reservado para contenido permitido en canales NSFW."
        );
      }

      // =================================================
      // NSFW
      // =================================================

      if (
        interaction.commandName ===
        "nsfw"
      ) {

        if (
          !interaction.channel?.nsfw
        ) {

          return await interaction.reply({
            content:
              "❌ Este comando solamente puede utilizarse en un canal marcado como NSFW.",
            ephemeral: true
          });
        }

        const tag =
          interaction.options.getString(
            "tag"
          ) || "default";

        return await interaction.reply(
          `🔞 Comando /nsfw recibido.\n🏷️ Tag: \`${tag}\``
        );
      }

      // =================================================
      // WARN
      // =================================================

      if (
        interaction.commandName ===
        "warn"
      ) {

        if (
          !tienePermiso(
            interaction,
            PermissionsBitField.Flags.ModerateMembers
          )
        ) {

          return await interaction.reply({
            content:
              "❌ No tienes permiso para advertir usuarios.",
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
          `⚠️ ${user.tag} tiene ${warns[user.id]}/3 advertencias.`
        );
      }

      // =================================================
      // WARNS
      // =================================================

      if (
        interaction.commandName ===
        "warns"
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
          `📋 ${user.tag} tiene ${warns[user.id] || 0}/3 advertencias.`
        );
      }

      // =================================================
      // BAN
      // =================================================

      if (
        interaction.commandName ===
        "ban"
      ) {

        if (
          !tienePermiso(
            interaction,
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
            "❌ El usuario no está en el servidor."
          );
        }

        if (!bot) {

          return await interaction.reply(
            "❌ No pude obtener al bot."
          );
        }

        if (
          !puedeModerar(
            member,
            bot
          )
        ) {

          return await interaction.reply(
            "❌ No puedo banear a ese usuario por la jerarquía del servidor."
          );
        }

        try {

          const razon =
            interaction.options.getString(
              "razon"
            ) ||
            "Sin razón especificada";

          await member.ban({
            reason: razon
          });

          return await interaction.reply(
            `🔨 **${user.tag}** fue baneado.\n📝 Razón: ${razon}`
          );

        } catch (err) {

          console.error(
            "❌ Error en ban:",
            err
          );

          return await interaction.reply(
            "❌ No pude banear al usuario."
          );
        }
      }

      // =================================================
      // KICK
      // =================================================

      if (
        interaction.commandName ===
        "kick"
      ) {

        if (
          !tienePermiso(
            interaction,
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

        const member =
          await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        const bot =
          interaction.guild.members.me;

        if (!member) {

          return await interaction.reply(
            "❌ El usuario no está en el servidor."
          );
        }

        if (!bot) {

          return await interaction.reply(
            "❌ No pude obtener al bot."
          );
        }

        if (
          !puedeModerar(
            member,
            bot
          )
        ) {

          return await interaction.reply(
            "❌ No puedo expulsar a ese usuario por la jerarquía del servidor."
          );
        }

        try {

          await member.kick(
            "Expulsado mediante /kick"
          );

          return await interaction.reply(
            `👢 **${user.tag}** fue expulsado.`
          );

        } catch (err) {

          console.error(
            "❌ Error en kick:",
            err
          );

          return await interaction.reply(
            "❌ No pude expulsar al usuario."
          );
        }
      }

      // =================================================
      // CLEAR
      // =================================================

      if (
        interaction.commandName ===
        "clear"
      ) {

        if (
          !tienePermiso(
            interaction,
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

      // =================================================
      // ROL
      // =================================================

      if (
        interaction.commandName ===
        "rol"
      ) {

        if (
          !tienePermiso(
            interaction,
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
        } else if (
          tipo === "admin"
        ) {
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
            `❌ No existe el rol **${roleName}**.`
          );
        }

        if (
          role.position >=
          bot.roles.highest.position
        ) {

          return await interaction.reply(
            "❌ El rol está por encima o al mismo nivel que el rol del bot."
          );
        }

        try {

          await member.roles.add(
            role
          );

          return await interaction.reply(
            `✅ **${role.name}** asignado a ${user.tag}.`
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

      // =================================================
      // QUITAR
      // =================================================

      if (
        interaction.commandName ===
        "quitar"
      ) {

        if (
          !tienePermiso(
            interaction,
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

      // =================================================
      // COMANDO DESCONOCIDO
      // =================================================

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

      // =================================================
      // EVITAR DOBLE RESPUESTA
      // =================================================

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
          "❌ No se pudo responder a la interacción:",
          replyError.message
        );
      }
    }
  }
);

// =====================================================
// LOGIN
// =====================================================

if (!process.env.TOKEN) {

  console.error(
    "❌ Falta la variable TOKEN."
  );

  process.exit(1);
}

client.login(
  process.env.TOKEN
);
