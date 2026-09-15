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
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: ["CHANNEL"]
});

// ================= DATOS =================

let warns = {};
const levels = new Map();
const warnedTemp = new Map();
const strikes = {};

if (fs.existsSync("./advertencias.json")) {
  try {
    warns = JSON.parse(
      fs.readFileSync("./advertencias.json", "utf8")
    );
  } catch (err) {
    console.error("❌ Error leyendo advertencias.json:", err);
    warns = {};
  }
}

function saveWarns() {
  fs.writeFileSync(
    "./advertencias.json",
    JSON.stringify(warns, null, 2)
  );
}

// ================= FUNCION PRO =================

function getRazonNoAccion(member, bot, accion) {
  const razones = [];

  if (member.id === member.guild.ownerId) {
    razones.push("👑 Es el creador del servidor");
  }

  if (member.roles.highest.position >= bot.roles.highest.position) {
    razones.push("🔝 Tiene un rol más alto o igual que el bot");
  }

  if (
    accion === "kick" &&
    !bot.permissions.has(PermissionsBitField.Flags.KickMembers)
  ) {
    razones.push("🚫 El bot no tiene permisos para expulsar");
  }

  if (
    accion === "ban" &&
    !bot.permissions.has(PermissionsBitField.Flags.BanMembers)
  ) {
    razones.push("🚫 El bot no tiene permisos para banear");
  }

  return razones;
}

// ================= FILTRO =================

const insultos = require("./insultos.json");
const blacklist = Array.isArray(insultos.palabras)
  ? insultos.palabras
  : [];

// ================= READY =================

client.once("clientReady", () => {
  console.log(`🔥 ${client.user.tag} activo`);
  console.log(`🏠 Servidores: ${client.guilds.cache.size}`);
});

// ================= MENSAJES =================

client.on("messageCreate", async message => {
  if (!message.guild || message.author.bot) return;

  try {
    const msg = message.content
      .toLowerCase()
      .replace(/[^a-z0-9]/gi, "");

    const bad = blacklist.some(p =>
      msg.includes(String(p).toLowerCase())
    );

    if (bad) {
      if (!warns[message.author.id]) {
        warns[message.author.id] = 0;
      }

      if (!warnedTemp.has(message.author.id)) {
        warnedTemp.set(message.author.id, true);

        const restantes =
          3 - warns[message.author.id];

        return message.reply(
          `⚠️ ${message.author}\n` +
          `📊 Advertencias: ${warns[message.author.id]}/3\n` +
          `❗ Te quedan ${restantes} antes de ser ` +
          `${strikes[message.author.id] ? "baneado" : "expulsado"}`
        );
      }

      warns[message.author.id]++;
      saveWarns();

      let texto =
        `⚠️ ${message.author.tag} tiene ` +
        `${warns[message.author.id]}/3 advertencias`;

      if (warns[message.author.id] >= 3) {
        const member =
          message.guild.members.cache.get(
            message.author.id
          );

        const bot = message.guild.members.me;

        if (member && bot) {
          const razones = getRazonNoAccion(
            member,
            bot,
            "kick"
          );

          if (razones.length > 0) {
            return message.reply(
              `❌ No puedo expulsar a ${message.author.tag} porque:\n` +
              razones.join("\n")
            );
          }

          try {
            const rolesPeligrosos =
              member.roles.cache.filter(role =>
                role.permissions.has(
                  PermissionsBitField.Flags.Administrator
                ) ||
                role.permissions.has(
                  PermissionsBitField.Flags.KickMembers
                ) ||
                role.permissions.has(
                  PermissionsBitField.Flags.BanMembers
                )
              );

            for (const role of rolesPeligrosos.values()) {
              if (
                role.position <
                bot.roles.highest.position
              ) {
                try {
                  await member.roles.remove(role);
                } catch (err) {
                  console.error(
                    `❌ No se pudo quitar el rol ${role.name}:`,
                    err.message
                  );
                }
              }
            }

            if (!strikes[message.author.id]) {
              await member.kick();

              strikes[message.author.id] = true;
              warns[message.author.id] = 0;
              saveWarns();

              texto +=
                "\n👢 Expulsado (segunda oportunidad)";
            } else {
              await member.ban();

              warns[message.author.id] = 0;
              saveWarns();

              texto +=
                "\n🔨 Baneado por reincidir";
            }

          } catch (err) {
            console.error(
              "❌ Error al castigar:",
              err
            );

            return message.reply(
              `❌ Error al castigar a ${message.author.tag}`
            );
          }
        }
      }

      warnedTemp.delete(message.author.id);

      return message.reply(texto);
    }

    // ================= NIVELES =================

    const data =
      levels.get(message.author.id) || {
        xp: 0,
        level: 1
      };

    data.xp += 10;

    if (data.xp >= data.level * 100) {
      data.level++;

      await message.channel.send(
        `🎉 ${message.author} subió a nivel ${data.level}`
      );
    }

    levels.set(message.author.id, data);

  } catch (err) {
    console.error(
      "❌ Error en messageCreate:",
      err
    );
  }
});

// ================= INTERACCIONES =================

client.on("interactionCreate", async interaction => {
  try {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    console.log(
      `📥 /${interaction.commandName} recibido`
    );

    switch (interaction.commandName) {

      // ================= PING =================

      case "ping": {
        return interaction.reply("🏓 Pong!");
      }

      // ================= QUITAR =================

      case "quitar": {
        if (
          !interaction.memberPermissions?.has(
            PermissionsBitField.Flags.ManageRoles
          )
        ) {
          return interaction.reply({
            content: "❌ No tienes permisos",
            ephemeral: true
          });
        }

        const user =
          interaction.options.getUser("usuario");

        const role =
          interaction.options.getRole("roleo");

        const member =
          interaction.guild.members.cache.get(
            user.id
          );

        const bot =
          interaction.guild.members.me;

        if (!member) {
          return interaction.reply(
            "❌ Usuario no encontrado"
          );
        }

        if (!role) {
          return interaction.reply(
            "❌ Rol no encontrado"
          );
        }

        if (!bot) {
          return interaction.reply(
            "❌ No pude obtener el miembro del bot"
          );
        }

        if (member.id === interaction.guild.ownerId) {
          return interaction.reply(
            "❌ No puedes quitar roles al creador"
          );
        }

        if (
          !bot.permissions.has(
            PermissionsBitField.Flags.ManageRoles
          )
        ) {
          return interaction.reply(
            "❌ El bot no tiene permiso para gestionar roles"
          );
        }

        if (
          role.position >=
          bot.roles.highest.position
        ) {
          return interaction.reply(
            "❌ Ese rol es más alto o igual que el rol del bot"
          );
        }

        if (!member.roles.cache.has(role.id)) {
          return interaction.reply(
            `❌ ${user.tag} no tiene ese rol`
          );
        }

        try {
          await member.roles.remove(role);

          return interaction.reply(
            `🧹 Rol ${role.name} quitado a ${user.tag}`
          );

        } catch (err) {
          console.error(
            "❌ Error quitando rol:",
            err
          );

          return interaction.reply(
            "❌ Error al quitar el rol"
          );
        }
      }

      // ================= NIVEL =================

      case "nivel": {
        const data =
          levels.get(interaction.user.id) || {
            xp: 0,
            level: 1
          };

        return interaction.reply(
          `📊 Nivel ${data.level} | XP ${data.xp}`
        );
      }

      // ================= BAN =================

      case "ban": {
        if (
          !interaction.memberPermissions?.has(
            PermissionsBitField.Flags.BanMembers
          )
        ) {
          return interaction.reply({
            content: "❌ Sin permisos",
            ephemeral: true
          });
        }

        const user =
          interaction.options.getUser("usuario");

        const member =
          interaction.guild.members.cache.get(
            user.id
          );

        const bot =
          interaction.guild.members.me;

        if (!member) {
          return interaction.reply(
            "❌ Usuario no encontrado"
          );
        }

        if (!bot) {
          return interaction.reply(
            "❌ No pude obtener el miembro del bot"
          );
        }

        const razones =
          getRazonNoAccion(
            member,
            bot,
            "ban"
          );

        if (razones.length > 0) {
          return interaction.reply(
            `❌ No puedo banear a **${user.tag}** porque:\n` +
            razones.join("\n")
          );
        }

        try {
          const rolesPeligrosos =
            member.roles.cache.filter(role =>
              role.permissions.has(
                PermissionsBitField.Flags.Administrator
              ) ||
              role.permissions.has(
                PermissionsBitField.Flags.KickMembers
              ) ||
              role.permissions.has(
                PermissionsBitField.Flags.BanMembers
              )
            );

          for (const role of rolesPeligrosos.values()) {
            if (
              role.position <
              bot.roles.highest.position
            ) {
              try {
                await member.roles.remove(role);
              } catch (err) {
                console.error(
                  `❌ No se pudo quitar ${role.name}:`,
                  err.message
                );
              }
            }
          }

          await member.ban();

          return interaction.reply(
            `🔨 ${user.tag} baneado\n` +
            `🧹 Roles peligrosos eliminados`
          );

        } catch (err) {
          console.error(
            "❌ Error al banear:",
            err
          );

          return interaction.reply(
            `❌ Error al banear a **${user.tag}**`
          );
        }
      }

      // ================= KICK =================

      case "kick": {
        if (
          !interaction.memberPermissions?.has(
            PermissionsBitField.Flags.KickMembers
          )
        ) {
          return interaction.reply({
            content: "❌ Sin permisos",
            ephemeral: true
          });
        }

        const user =
          interaction.options.getUser("usuario");

        const member =
          interaction.guild.members.cache.get(
            user.id
          );

        const bot =
          interaction.guild.members.me;

        if (!member) {
          return interaction.reply(
            "❌ Usuario no encontrado"
          );
        }

        if (!bot) {
          return interaction.reply(
            "❌ No pude obtener el miembro del bot"
          );
        }

        const razones =
          getRazonNoAccion(
            member,
            bot,
            "kick"
          );

        if (razones.length > 0) {
          return interaction.reply(
            `❌ No puedo expulsar a **${user.tag}** porque:\n` +
            razones.join("\n")
          );
        }

        try {
          const rolesPeligrosos =
            member.roles.cache.filter(role =>
              role.permissions.has(
                PermissionsBitField.Flags.Administrator
              ) ||
              role.permissions.has(
                PermissionsBitField.Flags.KickMembers
              ) ||
              role.permissions.has(
                PermissionsBitField.Flags.BanMembers
              )
            );

          for (const role of rolesPeligrosos.values()) {
            if (
              role.position <
              bot.roles.highest.position
            ) {
              try {
                await member.roles.remove(role);
              } catch (err) {
                console.error(
                  `❌ No se pudo quitar ${role.name}:`,
                  err.message
                );
              }
            }
          }

          await member.kick();

          return interaction.reply(
            `👢 ${user.tag} expulsado\n` +
            `🧹 Roles peligrosos eliminados`
          );

        } catch (err) {
          console.error(
            "❌ Error al expulsar:",
            err
          );

          return interaction.reply(
            `❌ Error al expulsar a **${user.tag}**`
          );
        }
      }

      // ================= COMANDO DESCONOCIDO =================

      default: {
        return interaction.reply({
          content: "❌ Comando no reconocido.",
          ephemeral: true
        });
      }
    }

  } catch (error) {
    console.error(
      "❌ Error en interactionCreate:",
      error
    );

    try {
      if (
        interaction.deferred ||
        interaction.replied
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
        replyError
      );
    }
  }
});

// ================= LOGIN =================

if (!process.env.TOKEN) {
  console.error("❌ Falta la variable TOKEN.");
  process.exit(1);
}

client.login(process.env.TOKEN);
