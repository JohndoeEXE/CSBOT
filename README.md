Discord Crypto Purchase Bot
A Discord bot that creates tickets for crypto purchases with automatic payment detection.

Features
Ticket System: Creates private tickets for purchases
Crypto Payment Detection: Automatically detects Bitcoin, Ethereum, and USDT payments
Admin Management: Add/remove items and manage pricing
Category System: Organized into Camshow, Fansign, and Content categories
Setup Instructions
1. Railway Deployment
Fork or upload this repository to GitHub
Connect your GitHub account to Railway
Create a new project and select this repository
Configure the environment variables (see below)
2. Environment Variables
Set these environment variables in Railway:

DISCORD_BOT_TOKEN=your_bot_token_here
ETHERSCAN_API_KEY=your_etherscan_api_key (optional for ETH monitoring)
TICKET_CATEGORY_ID=discord_category_id_for_tickets (optional)
PURCHASE_CHANNEL_ID=channel_id_for_purchase_menu (optional)
ADMIN_ROLE_ID=discord_role_id_for_admins (optional)
BTC_ADDRESS=your_bitcoin_address
ETH_ADDRESS=your_ethereum_address
USDT_ADDRESS=your_usdt_address
3. Discord Bot Setup
Go to Discord Developer Portal
Create a new application
Go to "Bot" section and create a bot
Copy the bot token and add it to your environment variables
Enable the following bot permissions:
Send Messages
Use Slash Commands
Manage Channels
Embed Links
Read Message History
Manage Messages
4. Discord Server Setup
Invite the bot to your server with admin permissions
Create a category for tickets (optional - bot can work without)
Note down the category ID and add it to environment variables
Run /setupmenu in the channel where you want the purchase menu
Bot Commands
Admin Commands
/setupmenu - Setup the purchase menu in current channel
/addpurchase <category> <item> <price> [currency] - Add items to categories
/removepurchase <category> <item> - Remove items from categories
/setprice <category> <price> [currency] - Set base category pricing
/addadmin <user> - Add admin users
/config - Show current bot configuration
/closeticket - Close the current ticket
User Experience
User selects category from dropdown menu
Bot creates private ticket channel
User selects item in ticket
Bot provides payment instructions
User sends crypto payment
Bot automatically detects and confirms payment
Categories
📹 Camshow: Live cam sessions and private shows
✍️ Fansign: Custom fansigns and personal messages
📱 Content: Exclusive content and media
Supported Cryptocurrencies
Bitcoin (BTC)
Ethereum (ETH)
USDT (Tether)
Security Notes
Never commit private keys or sensitive data to GitHub
Use environment variables for all configuration
Regularly update your crypto addresses
Monitor transactions manually as backup
Support
For issues or questions, check the GitHub repository or contact the administrator.

