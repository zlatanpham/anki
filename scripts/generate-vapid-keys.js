#!/usr/bin/env node

/**
 * VAPID Key Generation Script
 * 
 * Generates VAPID (Voluntary Application Server Identification) keys
 * required for Web Push Protocol authentication.
 * 
 * Usage: node scripts/generate-vapid-keys.js
 */

import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔐 Generating VAPID Keys for Web Push Notifications\n');

async function generateVapidKeys() {
try {
  // Generate VAPID keys
  const vapidKeys = webpush.generateVAPIDKeys();
  
  console.log('✅ VAPID Keys Generated Successfully!\n');
  
  console.log('📋 Keys:');
  console.log('─'.repeat(80));
  console.log('Public Key:');
  console.log(vapidKeys.publicKey);
  console.log('\nPrivate Key:');
  console.log(vapidKeys.privateKey);
  console.log('─'.repeat(80));
  
  console.log('\n📝 Environment Variables:');
  console.log('Add these to your .env.local file:\n');
  
  const envVars = [
    `VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`,
    `VAPID_PRIVATE_KEY="${vapidKeys.privateKey}"`,
    `VAPID_SUBJECT="mailto:your-email@domain.com"  # Replace with your email`,
  ];
  
  envVars.forEach(envVar => {
    console.log(envVar);
  });
  
  console.log('\n💡 Tips:');
  console.log('• Keep your private key secure and never expose it in client-side code');
  console.log('• The subject should be a mailto: URL or https: URL you control');
  console.log('• These keys are used to identify your application to push services');
  
  // Offer to append to .env file
  const envPath = path.join(__dirname, '..', '.env.local');
  const envExamplePath = path.join(__dirname, '..', '.env.example');
  
  console.log('\n🤔 Would you like to:');
  console.log('1. Append to .env.local (if it exists)');
  console.log('2. Create .env.local with these keys');
  console.log('3. Just display the keys (done above)');
  
  // Check if we're in an interactive terminal
  if (process.stdin.isTTY) {
    const { createInterface } = await import('readline');
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('\nEnter your choice (1-3): ', (answer) => {
      switch (answer.trim()) {
        case '1':
          appendToEnvFile(envPath, envVars);
          break;
        case '2':
          createEnvFile(envPath, envVars);
          break;
        case '3':
        default:
          console.log('\n✅ Keys displayed above. Please add them manually to your .env file.');
          break;
      }
      rl.close();
    });
  } else {
    console.log('\n✅ Keys generated successfully! Add them to your .env file manually.');
  }
  
} catch (error) {
  console.error('❌ Error generating VAPID keys:', error);
  process.exit(1);
}
}

// Run the function
generateVapidKeys();

function appendToEnvFile(envPath, envVars) {
  try {
    const envContent = '\n# VAPID Keys for Push Notifications\n' + envVars.join('\n') + '\n';
    fs.appendFileSync(envPath, envContent);
    console.log(`✅ VAPID keys appended to ${envPath}`);
  } catch (error) {
    console.error('❌ Error appending to .env file:', error);
    console.log('Please add the keys manually to your .env file.');
  }
}

function createEnvFile(envPath, envVars) {
  try {
    const envContent = `# Anki PWA Environment Variables
# Generated on ${new Date().toISOString()}

# Database
DATABASE_URL="your-database-url-here"

# NextAuth
NEXTAUTH_SECRET="your-nextauth-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# GitHub OAuth (optional)
AUTH_GITHUB_ID="your-github-id-here"
AUTH_GITHUB_SECRET="your-github-secret-here"

# Email service (optional)
RESEND_API_KEY="your-resend-api-key-here"
EMAIL_FROM="noreply@yourdomain.com"

# VAPID Keys for Push Notifications
${envVars.join('\n')}
`;

    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Created ${envPath} with VAPID keys`);
    console.log('📝 Please update the other environment variables as needed.');
  } catch (error) {
    console.error('❌ Error creating .env file:', error);
    console.log('Please create the .env file manually with the displayed keys.');
  }
}