const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, REST, Routes } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Store for categories, items, and transactions
const categories = {
    'camshow': {
        name: '📹 Camshow',
        items: {}
    },
    'fansign': {
        name: '✍️ Fansign', 
        items: {}
    },
    'content': {
        name: '📱 Content',
        items: {}
    }
};

const pendingTransactions = new Map();
const adminUsers = new Set(); // Add admin user IDs here

// Crypto addresses for receiving payments
const PAYMENT_ADDRESSES = {
    BTC: 'bc1qpw733guz8c9c0xccd4ypmf4fdxfx67vev4wrcu',
    ETH: '0x6F8f2CEE81a3D781679F0e6fa3A289BbBC6BeF3d',
    USDT: '0x6F8f2CEE81a3D781679F0e6fa3A289BbBC6BeF3d'
};

// Slash commands setup
const commands = [
    new SlashCommandBuilder()
        .setName('setprice')
        .setDescription('Set base price for a category')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('The category to set price for')
                .setRequired(true)
                .addChoices(
                    { name: 'Camshow', value: 'camshow' },
                    { name: 'Fansign', value: 'fansign' },
                    { name: 'Content', value: 'content' }
                ))
        .addNumberOption(option =>
            option.setName('price')
                .setDescription('The price in USD')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('currency')
                .setDescription('Payment currency')
                .setRequired(false)
                .addChoices(
                    { name: 'Bitcoin (BTC)', value: 'BTC' },
                    { name: 'Ethereum (ETH)', value: 'ETH' },
                    { name: 'USDT', value: 'USDT' }
                )),
    
    new SlashCommandBuilder()
        .setName('addpurchase')
        .setDescription('Add a purchase item to a category')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('The category to add item to')
                .setRequired(true)
                .addChoices(
                    { name: 'Camshow', value: 'camshow' },
                    { name: 'Fansign', value: 'fansign' },
                    { name: 'Content', value: 'content' }
                ))
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The item name')
                .setRequired(true))
        .addNumberOption(option =>
            option.setName('price')
                .setDescription('The price in USD')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('currency')
                .setDescription('Payment currency')
                .setRequired(false)
                .addChoices(
                    { name: 'Bitcoin (BTC)', value: 'BTC' },
                    { name: 'Ethereum (ETH)', value: 'ETH' },
                    { name: 'USDT', value: 'USDT' }
                )),

    new SlashCommandBuilder()
        .setName('removepurchase')
        .setDescription('Remove a purchase item from a category')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('The category to remove item from')
                .setRequired(true)
                .addChoices(
                    { name: 'Camshow', value: 'camshow' },
                    { name: 'Fansign', value: 'fansign' },
                    { name: 'Content', value: 'content' }
                ))
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The item name to remove')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Display the purchase menu'),

    new SlashCommandBuilder()
        .setName('addadmin')
        .setDescription('Add an admin user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to add as admin')
                .setRequired(true))
];

client.once('ready', async () => {
    console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
    
    // Register slash commands
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
    
    // Add the bot owner as admin (replace with your Discord ID)
    adminUsers.add('1393298243806560316');
    
    startTransactionMonitoring();
});

// Check if user is admin
function isAdmin(userId) {
    return adminUsers.has(userId);
}

client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        if (commandName === 'shop') {
            await showPurchaseMenu(interaction);
        }
        
        else if (commandName === 'setprice') {
            if (!isAdmin(interaction.user.id)) {
                await interaction.reply({ content: '❌ You need admin permissions to use this command.', ephemeral: true });
                return;
            }
            
            const category = interaction.options.getString('category');
            const price = interaction.options.getNumber('price');
            const currency = interaction.options.getString('currency') || 'USDT';
            
            // Set base price for category
            categories[category].basePrice = price;
            categories[category].baseCurrency = currency;
            
            await interaction.reply({ 
                content: `✅ Set base price for ${categories[category].name} to ${price} ${currency}`,
                ephemeral: true 
            });
        }
        
        else if (commandName === 'addpurchase') {
            if (!isAdmin(interaction.user.id)) {
                await interaction.reply({ content: '❌ You need admin permissions to use this command.', ephemeral: true });
                return;
            }
            
            const category = interaction.options.getString('category');
            const item = interaction.options.getString('item');
            const price = interaction.options.getNumber('price');
            const currency = interaction.options.getString('currency') || 'USDT';
            
            const itemId = `${category}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            
            categories[category].items[itemId] = {
                name: item,
                price: price,
                currency: currency
            };
            
            await interaction.reply({ 
                content: `✅ Added "${item}" to ${categories[category].name} for ${price} ${currency}`,
                ephemeral: true 
            });
        }
        
        else if (commandName === 'removepurchase') {
            if (!isAdmin(interaction.user.id)) {
                await interaction.reply({ content: '❌ You need admin permissions to use this command.', ephemeral: true });
                return;
            }
            
            const category = interaction.options.getString('category');
            const itemName = interaction.options.getString('item');
            
            // Find and remove item by name
            let removed = false;
            for (const [itemId, itemData] of Object.entries(categories[category].items)) {
                if (itemData.name.toLowerCase() === itemName.toLowerCase()) {
                    delete categories[category].items[itemId];
                    removed = true;
                    break;
                }
            }
            
            if (removed) {
                await interaction.reply({ 
                    content: `✅ Removed "${itemName}" from ${categories[category].name}`,
                    ephemeral: true 
                });
            } else {
                await interaction.reply({ 
                    content: `❌ Item "${itemName}" not found in ${categories[category].name}`,
                    ephemeral: true 
                });
            }
        }
        
        else if (commandName === 'addadmin') {
            if (!isAdmin(interaction.user.id)) {
                await interaction.reply({ content: '❌ You need admin permissions to use this command.', ephemeral: true });
                return;
            }
            
            const user = interaction.options.getUser('user');
            adminUsers.add(user.id);
            
            await interaction.reply({ 
                content: `✅ Added ${user.username} as an admin`,
                ephemeral: true 
            });
        }
    }
    
    else if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'purchase_menu') {
            await handleCategorySelection(interaction);
        } else if (interaction.customId.startsWith('category_')) {
            await handleItemSelection(interaction);
        }
    }
    
    else if (interaction.isButton()) {
        if (interaction.customId.startsWith('buy_')) {
            await handlePurchase(interaction);
        } else if (interaction.customId.startsWith('cancel_')) {
            await handleCancel(interaction);
        } else if (interaction.customId === 'back_to_categories') {
            await showPurchaseMenu(interaction);
        }
    }
});

async function showPurchaseMenu(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🛒 Purchase Menu')
        .setDescription('Select a category to view available items')
        .setColor(0x9b59b6)
        .setTimestamp();

    // Add category info to embed
    for (const [key, category] of Object.entries(categories)) {
        const itemCount = Object.keys(category.items).length;
        const basePrice = category.basePrice ? `Base: ${category.basePrice} ${category.baseCurrency}` : 'No base price set';
        
        embed.addFields({
            name: category.name,
            value: `${itemCount} items available\n${basePrice}`,
            inline: true
        });
    }

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('purchase_menu')
        .setPlaceholder('Choose a category...')
        .addOptions([
            {
                label: 'Camshow',
                description: 'Live cam sessions and shows',
                value: 'camshow',
                emoji: '📹'
            },
            {
                label: 'Fansign',
                description: 'Custom fansigns and messages',
                value: 'fansign',
                emoji: '✍️'
            },
            {
                label: 'Content',
                description: 'Exclusive content and media',
                value: 'content',
                emoji: '📱'
            }
        ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const replyOptions = {
        embeds: [embed],
        components: [row]
    };

    if (interaction.replied || interaction.deferred) {
        await interaction.editReply(replyOptions);
    } else {
        await interaction.reply(replyOptions);
    }
}

async function handleCategorySelection(interaction) {
    const category = interaction.values[0];
    const categoryData = categories[category];
    
    if (Object.keys(categoryData.items).length === 0) {
        await interaction.reply({
            content: `❌ No items available in ${categoryData.name} category yet.`,
            ephemeral: true
        });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle(`${categoryData.name} - Available Items`)
        .setDescription('Select an item to purchase')
        .setColor(0xe74c3c)
        .setTimestamp();

    // Create select menu options for items
    const options = [];
    for (const [itemId, item] of Object.entries(categoryData.items)) {
        embed.addFields({
            name: item.name,
            value: `💰 ${item.price} ${item.currency}`,
            inline: true
        });

        options.push({
            label: item.name,
            description: `${item.price} ${item.currency}`,
            value: itemId,
            emoji: '💎'
        });
    }

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`category_${category}`)
        .setPlaceholder('Choose an item to purchase...')
        .addOptions(options);

    const backButton = new ButtonBuilder()
        .setCustomId('back_to_categories')
        .setLabel('← Back to Categories')
        .setStyle(ButtonStyle.Secondary);

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(backButton);

    await interaction.update({
        embeds: [embed],
        components: [row1, row2]
    });
}

async function handleItemSelection(interaction) {
    const itemId = interaction.values[0];
    const category = interaction.customId.replace('category_', '');
    const item = categories[category].items[itemId];
    
    if (!item) {
        await interaction.reply({ content: '❌ Item not found!', ephemeral: true });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle(`🛍️ Purchase: ${item.name}`)
        .setDescription(`You selected: **${item.name}**\nFrom: ${categories[category].name}`)
        .addFields(
            { name: '💰 Price', value: `${item.price} ${item.currency}`, inline: true },
            { name: '💳 Payment Method', value: item.currency, inline: true },
            { name: '📍 Payment Address', value: `\`${PAYMENT_ADDRESSES[item.currency]}\``, inline: false }
        )
        .setColor(0x2ecc71)
        .setTimestamp();

    const buyButton = new ButtonBuilder()
        .setCustomId(`buy_${itemId}`)
        .setLabel('💳 Proceed to Payment')
        .setStyle(ButtonStyle.Success);

    const cancelButton = new ButtonBuilder()
        .setCustomId(`cancel_${itemId}`)
        .setLabel('❌ Cancel')
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(buyButton, cancelButton);

    await interaction.update({
        embeds: [embed],
        components: [row]
    });
}

async function handlePurchase(interaction) {
    const itemId = interaction.customId.replace('buy_', '');
    
    // Find the item across all categories
    let item = null;
    let categoryName = '';
    for (const [catKey, catData] of Object.entries(categories)) {
        if (catData.items[itemId]) {
            item = catData.items[itemId];
            categoryName = catData.name;
            break;
        }
    }
    
    if (!item) {
        await interaction.reply({ content: '❌ Item not found!', ephemeral: true });
        return;
    }

    const userId = interaction.user.id;
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store pending transaction
    pendingTransactions.set(transactionId, {
        userId: userId,
        itemId: itemId,
        item: item,
        category: categoryName,
        timestamp: Date.now(),
        status: 'pending'
    });

    const embed = new EmbedBuilder()
        .setTitle('⏳ Payment Instructions')
        .setDescription(`**Transaction ID:** \`${transactionId}\`\n\n**Send exactly ${item.price} ${item.currency} to:**`)
        .addFields(
            { name: '🛍️ Item', value: `${item.name} (${categoryName})`, inline: false },
            { name: '📍 Payment Address', value: `\`${PAYMENT_ADDRESSES[item.currency]}\``, inline: false },
            { name: '💰 Amount', value: `**${item.price} ${item.currency}**`, inline: true },
            { name: '⏰ Expires in', value: '30 minutes', inline: true },
            { name: '📋 Instructions', value: '1. Copy the address above\n2. Send the exact amount\n3. Wait for confirmation\n4. You will be notified when confirmed', inline: false }
        )
        .setColor(0xf39c12)
        .setFooter({ text: 'Transaction will be automatically detected' })
        .setTimestamp();

    await interaction.update({
        embeds: [embed],
        components: []
    });

    // Set timeout for transaction expiry
    setTimeout(() => {
        if (pendingTransactions.has(transactionId)) {
            const tx = pendingTransactions.get(transactionId);
            if (tx.status === 'pending') {
                tx.status = 'expired';
                pendingTransactions.set(transactionId, tx);
            }
        }
    }, 30 * 60 * 1000); // 30 minutes
}

async function handleCancel(interaction) {
    await interaction.update({
        content: '❌ Purchase cancelled.',
        embeds: [],
        components: []
    });
}

// Transaction monitoring functions
async function startTransactionMonitoring() {
    console.log('🔍 Starting crypto transaction monitoring...');
    
    setInterval(async () => {
        await monitorBitcoinTransactions();
        await monitorEthereumTransactions();
    }, 30000); // Check every 30 seconds
}

async function monitorBitcoinTransactions() {
    try {
        const response = await axios.get(`https://api.blockcypher.com/v1/btc/main/addrs/${PAYMENT_ADDRESSES.BTC}/full?limit=10`);
        
        if (response.data.txs) {
            for (const tx of response.data.txs) {
                await processBitcoinTransaction(tx);
            }
        }
    } catch (error) {
        console.error('Bitcoin monitoring error:', error.message);
    }
}

async function monitorEthereumTransactions() {
    try {
        const apiKey = process.env.ETHERSCAN_API_KEY;
        if (!apiKey) return;

        const response = await axios.get(`https://api.etherscan.io/api?module=account&action=txlist&address=${PAYMENT_ADDRESSES.ETH}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`);
        
        if (response.data.result) {
            for (const tx of response.data.result.slice(0, 10)) {
                await processEthereumTransaction(tx);
            }
        }
    } catch (error) {
        console.error('Ethereum monitoring error:', error.message);
    }
}

async function processBitcoinTransaction(tx) {
    for (const [txId, pendingTx] of pendingTransactions.entries()) {
        if (pendingTx.status !== 'pending' || pendingTx.item.currency !== 'BTC') continue;
        
        const receivedAmount = tx.outputs.reduce((sum, output) => {
            if (output.addresses && output.addresses.includes(PAYMENT_ADDRESSES.BTC)) {
                return sum + (output.value / 100000000);
            }
            return sum;
        }, 0);
        
        if (Math.abs(receivedAmount - pendingTx.item.price) < 0.0001) {
            await confirmTransaction(txId, tx.hash);
        }
    }
}

async function processEthereumTransaction(tx) {
    for (const [txId, pendingTx] of pendingTransactions.entries()) {
        if (pendingTx.status !== 'pending' || !['ETH', 'USDT'].includes(pendingTx.item.currency)) continue;
        
        const receivedAmount = parseFloat(tx.value) / Math.pow(10, 18);
        
        if (Math.abs(receivedAmount - pendingTx.item.price) < 0.001) {
            await confirmTransaction(txId, tx.hash);
        }
    }
}

async function confirmTransaction(transactionId, blockchainTxHash) {
    const tx = pendingTransactions.get(transactionId);
    if (!tx) return;
    
    tx.status = 'confirmed';
    tx.blockchainTxHash = blockchainTxHash;
    pendingTransactions.set(transactionId, tx);
    
    try {
        const user = await client.users.fetch(tx.userId);
        const embed = new EmbedBuilder()
            .setTitle('✅ Payment Confirmed!')
            .setDescription(`Your purchase has been confirmed!`)
            .addFields(
                { name: '🛍️ Item', value: `${tx.item.name} (${tx.category})`, inline: false },
                { name: '💰 Amount', value: `${tx.item.price} ${tx.item.currency}`, inline: true },
                { name: '🔗 Transaction', value: `\`${blockchainTxHash}\``, inline: false }
            )
            .setColor(0x2ecc71)
            .setTimestamp();
            
        await user.send({ embeds: [embed] });
        
        console.log(`✅ Transaction confirmed: ${transactionId} for user ${tx.userId}`);
    } catch (error) {
        console.error('Error notifying user:', error);
    }
}

client.on('error', console.error);

client.login(process.env.DISCORD_BOT_TOKEN);
