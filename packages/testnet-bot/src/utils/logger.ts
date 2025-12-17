/**
 * Simple logger for the bot
 */

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const icons = {
  info: 'ℹ️',
  success: '✅',
  warn: '⚠️',
  error: '❌',
  tx: '📝',
  account: '👤',
  merchant: '🏪',
  money: '💰',
  time: '⏱️',
  goal: '🎯',
};

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').split('.')[0];
}

export const logger = {
  info(message: string, ...args: any[]) {
    console.log(`${colors.gray}[${timestamp()}]${colors.reset} ${icons.info} ${message}`, ...args);
  },

  success(message: string, ...args: any[]) {
    console.log(`${colors.gray}[${timestamp()}]${colors.reset} ${icons.success} ${colors.green}${message}${colors.reset}`, ...args);
  },

  warn(message: string, ...args: any[]) {
    console.log(`${colors.gray}[${timestamp()}]${colors.reset} ${icons.warn} ${colors.yellow}${message}${colors.reset}`, ...args);
  },

  error(message: string, ...args: any[]) {
    console.error(`${colors.gray}[${timestamp()}]${colors.reset} ${icons.error} ${colors.red}${message}${colors.reset}`, ...args);
  },

  tx(action: string, details?: string) {
    console.log(`${colors.gray}[${timestamp()}]${colors.reset} ${icons.tx} ${colors.cyan}${action}${colors.reset}${details ? `: ${details}` : ''}`);
  },

  account(action: string, name: string) {
    console.log(`${colors.gray}[${timestamp()}]${colors.reset} ${icons.account} ${action}: ${colors.blue}${name}${colors.reset}`);
  },

  merchant(action: string, details?: string) {
    console.log(`${colors.gray}[${timestamp()}]${colors.reset} ${icons.merchant} ${colors.magenta}${action}${colors.reset}${details ? `: ${details}` : ''}`);
  },

  money(action: string, amount: string | number | bigint) {
    console.log(`${colors.gray}[${timestamp()}]${colors.reset} ${icons.money} ${action}: ${colors.green}${amount}${colors.reset}`);
  },

  goal(metric: string, current: number, target: number) {
    const percentage = Math.round((current / target) * 100);
    const bar = '█'.repeat(Math.floor(percentage / 10)) + '░'.repeat(10 - Math.floor(percentage / 10));
    console.log(`${colors.gray}[${timestamp()}]${colors.reset} ${icons.goal} ${metric}: ${bar} ${percentage}% (${current}/${target})`);
  },

  separator() {
    console.log(`${colors.gray}${'─'.repeat(60)}${colors.reset}`);
  },

  header(title: string) {
    console.log(`\n${colors.cyan}${'═'.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}  ${title}${colors.reset}`);
    console.log(`${colors.cyan}${'═'.repeat(60)}${colors.reset}\n`);
  },
};
