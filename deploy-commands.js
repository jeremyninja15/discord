const { REST, Routes } = require('discord.js');

// ================= COMANDOS =================
const commands = [

  { name: 'ping', description: 'Responde con Pong!' },

  { name: 'nivel', description: 'Mira tu nivel actual' },

  {
    name: 'crearbot',
    description: 'Guía para crear tu propio bot'
  },

  {
    name: 'ban',
    description: 'Banea un usuario',
    options: [
      {
        name: 'usuario',
        description: 'Usuario a banear',
        type: 6, // USER
        required: true
      }
    ]
  },

  {
    name: 'kick',
    description: 'Expulsa un usuario',
    options: [
      {
        name: 'usuario',
        description: 'Usuario a expulsar',
        type: 6,
        required: true
      }
    ]
  },

  {
    name: 'clear',
    description: 'Elimina mensajes',
    options: [
      {
        name: 'cantidad',
        description: 'Cantidad de mensajes (1-100)',
        type: 4, // INTEGER
        required: true
      }
    ]
  },

  {
    name: 'warn',
    description: 'Advertir a un usuario',
    options: [
      {
        name: 'usuario',
        description: 'Usuario a advertir',
        type: 6,
        required: true
      }
    ]
  },

  {
    name: 'warns',
    description: 'Ver advertencias de un usuario',
    options: [
      {
        name: 'usuario',
        description: 'Usuario',
        type: 6,
        required: true
      }
    ]
  },

  { name: 'help', description: 'Muestra los comandos disponibles' },

  { name: 'invite', description: 'Obtén el link para invitar el bot' },

  { name: 'panel', description: 'Abrir panel privado en DM' }

];

// ================= CONFIG =================
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// ================= REGISTRO =================
(async () => {
  try {
    console.log('🚀 Registrando slash commands...');

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log('✅ Slash commands listos.');
  } catch (error) {
    console.error('❌ Error registrando comandos:', error);
  }
})();
