const { REST, Routes } = require('discord.js');

// ================= CONFIG =================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// ================= COMANDOS =================
const commands = [

  // 🔹 BASICOS
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
      type: 3, // STRING
      required: true
    }
  ]
  },

  {
  name: 'rol',
  description: 'Asignar roles',
  options: [
    {
      name: 'usuario',
      description: 'Usuario',
      type: 6,
      required: true
    },
    {
      name: 'tipo',
      description: 'Tipo de rol',
      type: 3,
      required: true,
      choices: [
        { name: 'mod', value: 'mod' },
        { name: 'admin', value: 'admin' }
      ]
    }
  ]
  },

  {
    name: 'nivel',
    description: '📊 Muestra tu nivel actual'
  },
{
  name: 'quitar',
  description: '🎛 Ver roles del usuario',
  options: [
    {
      name: 'usuario',
      description: 'Usuario',
      type: 6,
      required: true
    }, 
    {
      name: 'roleo',
      description: 'rol a quitar',
      type: 8, 
      required: true 
    }
  ]
},
  {
    name: 'help',
    description: '📌 Lista de comandos disponibles'
  },

  {
    name: 'invite',
    description: '🔗 Obtén el link para invitar el bot'
  },

  {
    name: 'panel',
    description: '📲 Abre el panel privado en DM'
  },

  // 🔹 MODERACION
  {
    name: 'ban',
    description: '🔨 Banea un usuario del servidor',
    options: [
      {
        name: 'usuario',
        description: 'Usuario a banear',
        type: 6,
        required: true
      },
      {
        name: 'razon',
        description: 'Razón del ban',
        type: 3,
        required: false
      }
    ]
  },

  {
    name: 'kick',
    description: '👢 Expulsa un usuario',
    options: [
      {
        name: 'usuario',
        description: 'Usuario a expulsar',
        type: 6,
        required: true
      },
      {
        name: 'razon',
        description: 'Razón del kick',
        type: 3,
        required: false
      }
    ]
  },

  {
    name: 'clear',
    description: '🧹 Elimina mensajes (1 a 100)',
    options: [
      {
        name: 'cantidad',
        description: 'Cantidad de mensajes a eliminar',
        type: 4,
        required: true,
        min_value: 1,
        max_value: 100
      }
    ]
  },

  {
    name: 'warn',
    description: '⚠️ Advierte a un usuario',
    options: [
      {
        name: 'usuario',
        description: 'Usuario a advertir',
        type: 6,
        required: true
      },
      {
        name: 'razon',
        description: 'Razón de la advertencia',
        type: 3,
        required: false
      }
    ]
  },

  {
    name: 'warns',
    description: '📋 Ver advertencias de un usuario',
    options: [
      {
        name: 'usuario',
        description: 'Usuario',
        type: 6,
        required: true
      }
    ]
  }

];

// ================= REGISTRO =================
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('🚀 Iniciando registro de comandos...');
    console.log("🚀 Iniciando bot...");
    if (!TOKEN || !CLIENT_ID) {
      throw new Error("❌ Faltan variables de entorno (TOKEN o CLIENT_ID)");
    }

    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );

    console.log(`✅ ${commands.length} comandos registrados correctamente`);
  } catch (error) {
    console.error('❌ Error registrando comandos:', error);
  }
})();
