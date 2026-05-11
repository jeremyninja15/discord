const { REST, Routes } = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const commands = [

  // ================= BASICOS =================
  {
    name: 'ping',
    description: '🏓 Verifica si el bot está activo'
  },

  {
    name: "imagen",
    description: "Genera una imagen con IA",
    options: [
      {
        name: "prompt",
        description: "Describe la imagen",
        type: 3,
        required: true
      }
    ]
  },

  // ================= HENTAI (CON TAGS) =================
  {
    name: "hentai",
    description: "NSFW con tags",
    options: [
      {
        name: "tag",
        description: "Tipo de hentai",
        type: 3,
        required: false,
        choices: [
          { name: "Neko", value: "neko" },
          { name: "Kitsune", value: "kitsune" },
          { name: "Slap", value: "slap" },
          { name: "Waifu", value: "waifu" }
        ]
      }
    ]
  },
{
  name: "nsfw",
  description: "📸 Buscador Gelbooru por tags",
  options: [
    {
      name: "tag",
      description: "Etiqueta a buscar (ej: neko, hentai, waifu)",
      type: 3,
      required: false
    }
  ]
},
  // ================= ROLES =================
  {
    name: 'rol',
    description: 'Asignar roles',
    options: [
      {
        name: 'usuario',
        type: 6,
        description: 'Usuario',
        required: true
      },
      {
        name: 'tipo',
        type: 3,
        description: 'Tipo de rol',
        required: true,
        choices: [
          { name: 'mod', value: 'mod' },
          { name: 'admin', value: 'admin' }
        ]
      }
    ]
  },

  {
    name: 'quitar',
    description: 'Quitar roles',
    options: [
      {
        name: 'usuario',
        type: 6,
        required: true,
        description: 'Usuario'
      },
      {
        name: 'roleo',
        type: 8,
        required: true,
        description: 'Rol a quitar'
      }
    ]
  },

  // ================= MODERACION =================
  {
    name: 'ban',
    description: '🔨 Banea usuario',
    options: [
      {
        name: 'usuario',
        type: 6,
        required: true,
        description: 'Usuario'
      },
      {
        name: 'razon',
        type: 3,
        required: false,
        description: 'Razón'
      }
    ]
  },

  {
    name: 'kick',
    description: '👢 Expulsa usuario',
    options: [
      {
        name: 'usuario',
        type: 6,
        required: true,
        description: 'Usuario'
      }
    ]
  },

  {
    name: 'clear',
    description: '🧹 Borra mensajes',
    options: [
      {
        name: 'cantidad',
        type: 4,
        required: true,
        min_value: 1,
        max_value: 100,
        description: 'Cantidad'
      }
    ]
  },

  // ================= INFO =================
  {
    name: 'nivel',
    description: '📊 Ver tu nivel'
  },

  {
    name: 'help',
    description: '📌 Comandos'
  },

  {
    name: 'invite',
    description: '🔗 Invite link'
  },

  {
    name: 'warn',
    description: '⚠️ Advertir usuario',
    options: [
      {
        name: 'usuario',
        type: 6,
        required: true,
        description: 'Usuario'
      }
    ]
  },

  {
    name: 'warns',
    description: '📋 Ver warns',
    options: [
      {
        name: 'usuario',
        type: 6,
        required: true,
        description: 'Usuario'
      }
    ]
  }
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('🚀 Registrando comandos...');

    if (!TOKEN || !CLIENT_ID) {
      throw new Error("❌ Faltan TOKEN o CLIENT_ID");
    }

    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );

    console.log(`✅ ${commands.length} comandos registrados`);
  } catch (err) {
    console.error('❌ Error:', err);
  }
})();

