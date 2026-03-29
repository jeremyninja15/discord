const { REST, Routes } = require('discord.js');

const commands = [
  { name: 'ping', description: 'Responde con Pong!' },
  { name: 'nivel', description: 'Mira tu nivel actual' },
  { name: 'crearbot', description: 'Guía para crear tu bot' },

  {
    name: 'warn',
    description: 'Advertir usuario',
    options: [
      { name: 'usuario', description: 'Usuario', type: 6, required: true }
    ]
  },

  {
    name: 'warns',
    description: 'Ver advertencias',
    options: [
      { name: 'usuario', description: 'Usuario', type: 6, required: true }
    ]
  },

  { name: 'help', description: 'Ver comandos' },
  { name: 'invite', description: 'Invitar bot' }
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('🚀 Registrando comandos...');

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log('✅ Comandos listos');
  } catch (error) {
    console.error(error);
  }
})();
