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
name: 'nivel',
description: '📊 Muestra tu nivel actual'
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

{
name: 'crearbot',
description: '🤖 Aprende a crear tu propio bot paso a paso'
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

const {
Client,
GatewayIntentBits,
PermissionsBitField,
EmbedBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
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
GatewayIntentBits.MessageContent,
GatewayIntentBits.DirectMessages
],
partials: ['CHANNEL']
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

// ================= PALABRAS =================
const blacklist = ['tonto', 'idiota', 'maldicion'];

// ================= READY =================
client.once('clientReady', () => {
console.log(🔥 ${client.user.tag} activo);
});

// ================= MENSAJES =================
client.on('messageCreate', async message => {
if (!message.guild || message.author.bot) return;

const msg = message.content.toLowerCase();

// ===== FILTRO =====
const bad = blacklist.some(p => msg.includes(p));

if (bad) {

if (!warnedTemp.has(message.author.id)) {  
  warnedTemp.set(message.author.id, true);  
  return message.reply(`⚠ ${message.author}, evita insultar.`);  
}  

if (!warns[message.author.id]) warns[message.author.id] = 0;  
warns[message.author.id]++;  
saveWarns();  

let texto = `⚠ ${message.author.tag} tiene ${warns[message.author.id]} advertencias`;  

if (warns[message.author.id] >= 3) {  
  const member = message.guild.members.cache.get(message.author.id);  
  if (member) {  
    await member.ban();  
    texto += `\n🔨 Baneado por exceso de advertencias`;  
  }  
}  

warnedTemp.delete(message.author.id);  
return message.reply(texto);

}

// ===== NIVELES =====
const data = levels.get(message.author.id) || { xp: 0, level: 1 };

data.xp += 10;

if (data.xp >= data.level * 100) {
data.level++;
message.channel.send(🎉 ${message.author} subió a nivel ${data.level});
}

levels.set(message.author.id, data);
});

// ================= INTERACCIONES =================
client.on('interactionCreate', async interaction => {
try {

// ===== COMANDOS =====  
if (interaction.isChatInputCommand()) {  

  const user = interaction.options.getUser?.("usuario");  

  switch (interaction.commandName) {  

    case "ping":  
      return interaction.reply("🏓 Pong!");  

    case "nivel": {  
      const data = levels.get(interaction.user.id) || { xp: 0, level: 1 };  
      return interaction.reply(`📊 Nivel ${data.level} | XP ${data.xp}`);  
    }  

    case "warn":  
      if (!user) return interaction.reply("Usuario no encontrado.");  
      if (!warns[user.id]) warns[user.id] = 0;  
      warns[user.id]++;  
      saveWarns();  
      return interaction.reply(`⚠ ${user.tag} ahora tiene ${warns[user.id]} warns`);  

    case "warns":  
      if (!user) return interaction.reply("Usuario no encontrado.");  
      return interaction.reply(`📋 ${user.tag} tiene ${warns[user.id] || 0} advertencias`);


    case "ban":
  if (!interaction.memberPermissions.has(PermissionsBitField.Flags.BanMembers))
    return interaction.reply({ content: "❌ Sin permisos", ephemeral: true });

  if (!user) return interaction.reply("❌ Usuario no válido");

  const memberBan = interaction.guild.members.cache.get(user.id);
  if (!memberBan) return interaction.reply("❌ No encontrado");

  await memberBan.ban({ reason: interaction.options.getString("razon") || "Sin razón" });

  return interaction.reply(`🔨 ${user.tag} fue baneado`);

case "kick":
  if (!interaction.memberPermissions.has(PermissionsBitField.Flags.KickMembers))
    return interaction.reply({ content: "❌ Sin permisos", ephemeral: true });

  if (!user) return interaction.reply("❌ Usuario no válido");

  const memberKick = interaction.guild.members.cache.get(user.id);
  if (!memberKick) return interaction.reply("❌ No encontrado");

  await memberKick.kick(interaction.options.getString("razon") || "Sin razón");

  return interaction.reply(`👢 ${user.tag} fue expulsado`);

case "clear":
  if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageMessages))
    return interaction.reply({ content: "❌ Sin permisos", ephemeral: true });

  const cantidad = interaction.options.getInteger("cantidad");

  await interaction.deferReply({ ephemeral: true });
  await interaction.channel.bulkDelete(cantidad, true);

  return interaction.editReply(`🧹 ${cantidad} mensajes eliminados`);

case "panel":
  try {
    await interaction.user.send("📲 Panel privado activado");
    return interaction.reply({ content: "✅ Revisa tu DM", ephemeral: true });
  } catch {
    return interaction.reply({ content: "❌ No puedo enviarte DM", ephemeral: true });
  }
      

    case "help":  
      return interaction.reply({  
        content: `

📌 Comandos:
/ping
/nivel
/warn
/warns
/crearbot
/help
/invite
`,
ephemeral: true
});

case "invite":  
      return interaction.reply({  
        content: `🔗 Invita el bot:

https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot%20applications.commands`,
ephemeral: true
});

case "crearbot":  

      const embed = new EmbedBuilder()  
        .setColor("Purple")  
        .setTitle("🤖 Crear tu bot")  
        .setDescription("Usa los botones 👇");  

      const row = new ActionRowBuilder().addComponents(  
        new ButtonBuilder().setCustomId("paso1").setLabel("Crear bot").setStyle(ButtonStyle.Primary),  
        new ButtonBuilder().setCustomId("paso2").setLabel("Token").setStyle(ButtonStyle.Primary),  
        new ButtonBuilder().setCustomId("archivos").setLabel("📄 Archivos base").setStyle(ButtonStyle.Secondary),  
        new ButtonBuilder().setCustomId("zip").setLabel("📦 Descargar bot").setStyle(ButtonStyle.Success)  
      );  

      return interaction.reply({ embeds: [embed], components: [row] });  
  }  
}  

// ===== BOTONES =====  
if (interaction.isButton()) {  

  if (interaction.customId === "paso1") {  
    return interaction.reply({  
      content: "👉 https://discord.com/developers/applications → New Application → Bot",  
      ephemeral: true  
    });  
  }  

  if (interaction.customId === "paso2") {  
    return interaction.reply({  
      content: "🔑 Bot → Reset Token → copia tu TOKEN",  
      ephemeral: true  
    });  
  }  

  if (interaction.customId === "archivos") {  
    return interaction.reply({  
      content: `

📦 ARCHIVOS BASE

📄 index.js
```js
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('clientReady', () => console.log("Bot listo"));
client.login("TU_TOKEN");
```

📄 package.json
```json
{
"name": "mi-bot",
"version": "1.0.0",
"main": "index.js",
"dependencies": {
"discord.js": "^14.0.0"
}
}
```
`,
ephemeral: true
});
}

if (interaction.customId === "zip") {  

    const output = fs.createWriteStream('./bot.zip');  
    const archive = archiver('zip');  

    archive.pipe(output);  

    archive.append(`const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.once('clientReady', () => console.log("Bot listo"));
client.login("TU_TOKEN");`, { name: 'index.js' });

archive.append(`{

"name": "mi-bot",
"version": "1.0.0",
"main": "index.js",
"dependencies": {
"discord.js": "^14.0.0"
}
}`, { name: 'package.json' });

await archive.finalize();  

    setTimeout(async () => {  
      const file = new AttachmentBuilder('./bot.zip');  
      await interaction.reply({  
        content: "📦 Aquí tienes tu bot:",  
        files: [file],  
        ephemeral: true  
      });  
    }, 1000);  
  }  
}

} catch (error) {
console.error(error);

if (interaction.isRepliable() && !interaction.replied) {  
  await interaction.reply({  
    content: "⚠ Error en el bot",  
    ephemeral: true  
  });  
}

}
});

// ================= LOGIN =================
client.login(process.env.TOKEN);
