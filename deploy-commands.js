const { REST, Routes } = require('discord.js');

const commands = [
  { name: 'ping', description: 'Responde con Pong!' },
  { name: 'nivel', description: 'Ver nivel' },

  {
    name: 'warn',
    description: 'Advertir usuario',
    options: [
      {
        name: 'usuario',
        description: 'Usuario',
        type: 6,
        required: true
      }
    ]
  },

  { name: 'crearbot', description: 'Aprende a crear tu bot' }
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Registrando comandos...');

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log('Comandos listos');
  } catch (error) {
    console.error(error);
  }
})();
