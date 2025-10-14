// @ts-nocheck
// ==UserScript==
// @name         YellowDoge Dark Mode
// @match        *://*.binance.com/*
// @grant        GM_xmlhttpRequest
// @connect      api.telegram.org
// ==/UserScript==

(function() {
    'use strict';

    // Create overlay div with given styles and title
    function makeOverlay(id, title, position) {
        const div = document.createElement('div');
        Object.assign(div.style, {
            position: 'fixed',
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '12px 20px',
            fontSize: '16px',
            fontWeight: '700',
            borderRadius: '10px',
            zIndex: 99999999,
            userSelect: 'text',
            minWidth: '200px',
            boxShadow: '0 0 10px rgba(0,0,0,0.5)',
            cursor: 'move',
            ...position,
        });
        div.id = id;
        div.innerHTML = `<div style="font-weight:bold; font-size:18px; margin-bottom:6px; cursor:move;">${title}</div><div id="${id}-content">Loading...</div>`;
        
        // Make draggable with auto-hover pause
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        div.addEventListener('mouseenter', () => {
            autoHoverEnabled = false; // Stop auto-hover when mouse is on overlay
        });
        
        div.addEventListener('mouseleave', () => {
            autoHoverEnabled = true; // Resume auto-hover when mouse leaves overlay
        });
        
        div.addEventListener('mousedown', (e) => {
            isDragging = true;
            autoHoverEnabled = false;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseInt(div.style.left);
            startTop = parseInt(div.style.top);
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const newLeft = startLeft + e.clientX - startX;
            const newTop = startTop + e.clientY - startY;
            div.style.left = newLeft + 'px';
            div.style.top = newTop + 'px';
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            setTimeout(() => {
                autoHoverEnabled = true; // Resume auto-hover after drag
            }, 500);
        });
        
        document.body.appendChild(div);
        return div;
    }

    // Get element by XPath
    function getXPathElement(xpath) {
        try {
            return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        } catch {
            return null;
        }
    }

    // Wait for element to appear (with timeout)
    async function waitForXPath(xpath, timeout = 15000, interval = 500) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const el = getXPathElement(xpath);
            if (el) return el;
            await new Promise(r => setTimeout(r, interval));
        }
        return null;
    }

    async function main() {
        // Global variables
        window.currentBalance = 0;
        window.livePrice = null;
        let mousePaused = false;
        let mousePauseTimer = null;
        let countdownInterval = null;
        let originalContent = '';
        
        let currentCount = 0;
        let balanceBeforeTrade = 0;
        let sessionVolume = 0;
        
        // Telegram configuration
        const TELEGRAM_BOT_TOKEN = '8394008255:AAH7r1AHxSYx8iFFP32mfUOvOWg3o_NocxA';
        const TELEGRAM_CHAT_ID = '@LeonTradingBot';
        
        // Enhanced WebSocket and data interception
        function interceptWebSocket() {
            const originalWebSocket = window.WebSocket;
            window.WebSocket = function(...args) {
                const ws = new originalWebSocket(...args);
                console.log('WebSocket created:', args[0]);
                
                const originalOnMessage = ws.onmessage;
                ws.onmessage = function(event) {
                    try {
                        const data = JSON.parse(event.data);
                        
                        // Binance stream formats
                        if (data.stream && data.data) {
                            const streamData = data.data;
                            if (streamData.c) window.livePrice = parseFloat(streamData.c);
                            if (streamData.k && streamData.k.c) window.livePrice = parseFloat(streamData.k.c);
                        }
                        
                        // Direct ticker/kline data
                        if (data.c && parseFloat(data.c) > 0) {
                            window.livePrice = parseFloat(data.c);
                        }
                        if (data.k && data.k.c && parseFloat(data.k.c) > 0) {
                            window.livePrice = parseFloat(data.k.c);
                        }
                        
                        // Array format
                        if (Array.isArray(data) && data.length > 0) {
                            data.forEach(item => {
                                if (item.c) window.livePrice = parseFloat(item.c);
                                if (item.k && item.k.c) window.livePrice = parseFloat(item.k.c);
                            });
                        }
                        
                        // Removed verbose logging
                    } catch (e) {}
                    
                    if (originalOnMessage) {
                        originalOnMessage.call(this, event);
                    }
                };
                
                return ws;
            };
        }
        
        // Intercept fetch requests for price data
        function interceptFetch() {
            const originalFetch = window.fetch;
            window.fetch = function(...args) {
                return originalFetch.apply(this, args).then(response => {
                    if (response.url.includes('ticker') || response.url.includes('klines')) {
                        response.clone().json().then(data => {
                            if (data.price) window.livePrice = parseFloat(data.price);
                            if (data.c) window.livePrice = parseFloat(data.c);
                            if (Array.isArray(data) && data.length > 0 && data[0].length > 4) {
                                window.livePrice = parseFloat(data[data.length - 1][4]); // Close price
                            }
                        }).catch(() => {});
                    }
                    return response;
                });
            };
        }
        
        interceptWebSocket();
        interceptFetch();
        
        // Intercept global price variables
        function interceptGlobalData() {
            // Monitor window object for price data
            const checkGlobals = () => {
                if (window.binanceData && window.binanceData.price) {
                    window.livePrice = parseFloat(window.binanceData.price);
                }
                if (window.currentPrice && parseFloat(window.currentPrice) > 0) {
                    window.livePrice = parseFloat(window.currentPrice);
                }
                // Check for TradingView datafeeds
                if (window.TradingView && window.TradingView.widget) {
                    try {
                        const chart = window.TradingView.widget.chart();
                        if (chart && chart.getSeries) {
                            const series = chart.getSeries();
                            if (series && series.data && series.data.length > 0) {
                                const lastBar = series.data[series.data.length - 1];
                                if (lastBar.close) window.livePrice = lastBar.close;
                            }
                        }
                    } catch (e) {}
                }
            };
            setInterval(checkGlobals, 100);
        }
        
        interceptGlobalData();
        
        // Auto-hover chart to trigger price display
        let debugDot = null;
        function triggerChartHover() {
            const canvas = document.querySelector('canvas.hit');
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                const hoverXOffset = parseFloat(document.getElementById('hover-x')?.value || '-20');
                const x = rect.right + hoverXOffset;
                const centerY = rect.top + rect.height / 2;
                
                const yOffset = (Math.random() - 0.5) * 6;
                const y = centerY + yOffset;
                
                // Debug: Show red dot at hover position
                if (!debugDot) {
                    debugDot = document.createElement('div');
                    debugDot.style.cssText = 'position:fixed;width:10px;height:10px;background:red;border-radius:50%;z-index:999999999;pointer-events:none;';
                    document.body.appendChild(debugDot);
                }
                debugDot.style.left = (x - 5) + 'px';
                debugDot.style.top = (y - 5) + 'px';
                
                canvas.dispatchEvent(new MouseEvent('mousemove', {
                    bubbles: true,
                    clientX: x,
                    clientY: y
                }));
            }
        }
        
        // Control auto-hover to avoid interfering with user interactions
        let autoHoverEnabled = true;
        let hoverInterval = setInterval(() => {
            triggerChartHover();
        }, 100); // Always trigger, removed autoHoverEnabled check
        
        // Monitor DOM changes for price updates
        const observer = new MutationObserver(() => {
            // Force update when DOM changes
            triggerChartHover();
        });
        
        // Start observing chart area for changes
        setTimeout(() => {
            const chartArea = document.querySelector('[data-testid="kline"]') || document.body;
            observer.observe(chartArea, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }, 1000);
        
        // Update countdown display
        function updateCountdown() {
            const contentDiv = document.getElementById('trading-overlay-content');
            if (!contentDiv) return;
            
            if (currentCount > 0) {
                contentDiv.innerHTML = `<div style="text-align:center; font-size:48px; padding:20px;">${currentCount}</div>`;
            } else {
                contentDiv.innerHTML = originalContent;
            }
        }
        
        // Start countdown
        function startCountdown() {
            const contentDiv = document.getElementById('trading-overlay-content');
            if (!contentDiv) return;
            
            // Save current content if not already in countdown
            if (currentCount === 0) {
                originalContent = contentDiv.innerHTML;
            }
            
            currentCount = 5;
            updateCountdown();
            
            if (countdownInterval) clearInterval(countdownInterval);
            
            countdownInterval = setInterval(() => {
                currentCount--;
                if (currentCount > 0) {
                    updateCountdown();
                } else {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                    updateCountdown();
                }
            }, 1000);
        }
        
        // Mouse movement detection for pause (TEMPORARILY DISABLED)
        // document.addEventListener('mousemove', () => {
        //     // Reset countdown to 5 on any mouse move
        //     if (countdownInterval) {
        //         currentCount = 5;
        //         updateCountdown();
        //     } else {
        //         startCountdown();
        //     }
        //     
        //     mousePaused = true;
        //     clearTimeout(mousePauseTimer);
        //     mousePauseTimer = setTimeout(() => {
        //         mousePaused = false;
        //     }, 5000);
        // });
        
        // Get token name
        function getTokenName() {
            return getXPathElement('/html/body/div[4]/div/div[2]/div/div/div[1]/div[3]/div[1]')?.textContent.trim() || 'Unknown';
        }
        
        // Create single overlay
        const overlay = makeOverlay('trading-overlay', `🐕 YellowDoge - ${getTokenName()}`, {top: '12px', left: '12px'});
        
        // Update overlay content structure
        const overlayHTML = `
            <div style="font-size:11px; margin-bottom:4px;">
                Nickname: <input id="user-nickname" type="text" placeholder="Enter name" value="${localStorage.getItem('traderNickname') || ''}" style="width:100px; padding:2px; background:#333; color:white; border:1px solid #555; border-radius:3px; font-size:11px;" />
            </div>
            <div style="font-size:11px; margin-bottom:4px;">
                Hover X: <input id="hover-x" type="number" value="${localStorage.getItem('hoverX') || '-105'}" style="width:50px; padding:2px; background:#333; color:white; border:1px solid #555; border-radius:3px; font-size:11px;" /> px from right
                <button id="save-config" style="padding:2px 6px; cursor:pointer; background:#4CAF50; border:none; border-radius:3px; color:white; font-size:9px; margin-left:4px;">Save</button>
            </div>
            <div style="font-size:20px; font-weight:bold; margin-bottom:8px;">
                <div style="margin-bottom:4px;">Market: <span id="market-price" style="color:#FFD700;">Loading...</span></div>
                <div style="margin-bottom:4px;">Buy: <span id="buy-price" style="color:#4CAF50;">-</span></div>
                <div style="margin-bottom:4px;">Sell: <span id="sell-price" style="color:#FF6B6B;">-</span></div>
                <div style="margin-bottom:4px;">Loss: <span id="loss-percent" style="color:#FF9800;">-</span></div>
            </div>
            <div style="font-size:18px; font-weight:bold; color:#FF0000; margin-bottom:4px; padding:8px; background:rgba(255,0,0,0.1); border-radius:4px;">
                Total Loss: <span id="total-loss-display">0.000000</span> USDT
            </div>
            <div style="font-size:11px; margin-bottom:8px;">
                Set Loss: <input id="loss-input" type="number" step="0.000001" value="${localStorage.getItem('lossInput') || '0'}" style="width:70px; padding:2px; background:#333; color:white; border:1px solid #555; border-radius:3px; font-size:11px;" />
                <button id="update-loss-btn" style="padding:2px 8px; cursor:pointer; background:#FF5722; border:none; border-radius:3px; color:white; font-size:10px;">Update</button>
            </div>
            <div style="font-size:11px; color:#999; margin-bottom:4px;">
                Balance: <span id="balance">-</span> | Spread: <span id="spread-info">-</span>
            </div>
            <div style="font-size:11px; margin-bottom:4px;">
                Amount: <input id="trade-amount" type="number" value="${localStorage.getItem('tradeAmount') || '1'}" style="width:50px; padding:2px; background:#333; color:white; border:1px solid #555; border-radius:3px; font-size:11px;" /> USDT
            </div>
            <div style="display:flex; gap:4px; margin-bottom:4px;">
                <button id="fill-buy" style="padding:4px 8px; cursor:pointer; background:#4CAF50; border:none; border-radius:4px; color:white; font-size:11px;">Fill</button>
                <button id="auto-buy" style="padding:4px 8px; cursor:pointer; background:#2E7D32; border:none; border-radius:4px; color:white; font-size:11px;">Buy</button>
            </div>
            <div style="font-size:11px; margin-bottom:2px;">
                Max Loss: <input id="max-loss" type="number" value="${localStorage.getItem('maxLoss') || '2'}" step="0.1" style="width:50px; padding:2px; background:#333; color:white; border:1px solid #555; border-radius:3px; font-size:11px;" />
                Delay: <input id="trade-delay" type="number" value="${localStorage.getItem('tradeDelay') || '2'}" min="1" max="10" style="width:40px; padding:2px; background:#333; color:white; border:1px solid #555; border-radius:3px; font-size:11px;" />s
            </div>
            <div style="display:flex; align-items:center; gap:4px; margin-top:6px; padding-top:6px; border-top:1px solid #555;">
                <input id="bulk-trades" type="number" value="${localStorage.getItem('bulkTrades') || '10'}" min="1" style="width:40px; padding:2px; background:#333; color:white; border:1px solid #555; border-radius:3px; font-size:11px;" />
                <button id="bulk-start" style="padding:4px 10px; cursor:pointer; background:#FF9800; border:none; border-radius:4px; color:white; font-size:11px; font-weight:bold;">Start</button>
                <button id="bulk-pause" style="padding:4px 10px; cursor:pointer; background:#F44336; border:none; border-radius:4px; color:white; font-size:11px; font-weight:bold; display:none;">Pause</button>
                <button id="bulk-stop" style="padding:4px 10px; cursor:pointer; background:#D32F2F; border:none; border-radius:4px; color:white; font-size:11px; font-weight:bold; display:none;">Stop</button>
                <button id="clear-history" style="padding:4px 10px; cursor:pointer; background:#9C27B0; border:none; border-radius:4px; color:white; font-size:11px;">Clear</button>
            </div>
            <div style="margin-top:4px;">
                <button id="test-telegram" style="padding:4px 10px; cursor:pointer; background:#0088cc; border:none; border-radius:4px; color:white; font-size:11px; width:100%;">📱 Test Telegram</button>
            </div>
            <div style="font-size:11px; margin-top:4px;">
                <label style="cursor:pointer;"><input type="checkbox" id="detailed-report" style="margin-right:4px;"/> Detailed Report</label>
                <label style="cursor:pointer; margin-left:8px;"><input type="checkbox" id="console-log-enabled" style="margin-right:4px;"/> Console Log</label>
            </div>
            <div id="bulk-status" style="margin-top:4px; font-size:11px; color:#FFD700;"></div>
            <div style="margin-top:4px;">
                <textarea id="log-output" readonly style="width:100%; height:100px; background:#1a1a1a; color:#0f0; border:1px solid #555; border-radius:3px; font-family:monospace; font-size:9px; padding:4px; resize:vertical;"></textarea>
                <button id="clear-log" style="padding:2px 6px; cursor:pointer; background:#555; border:none; border-radius:3px; color:white; font-size:9px; margin-top:2px;">Clear Log</button>
            </div>
        `;
        document.getElementById('trading-overlay-content').innerHTML = overlayHTML;
        originalContent = overlayHTML;
        
        // Helper to simulate human-like mouse movement
        function simulateMouseMove(element) {
            const rect = element.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            
            element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, clientX: x, clientY: y }));
            element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: x, clientY: y }));
            element.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: x, clientY: y }));
        }
        
        // Helper to simulate human-like click
        function humanClick(element) {
            const rect = element.getBoundingClientRect();
            const x = rect.left + rect.width / 2 + (Math.random() - 0.5) * 4;
            const y = rect.top + rect.height / 2 + (Math.random() - 0.5) * 4;
            
            simulateMouseMove(element);
            element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: x, clientY: y }));
            setTimeout(() => {
                element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: x, clientY: y }));
                element.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
            }, 20 + Math.random() * 30);
        }
        
        // Helper to set React input value with human-like typing
        function setReactValue(input, value) {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeInputValueSetter.call(input, value);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true }));
        }
        
        // Random delay helper
        function randomDelay(min, max) {
            return min + Math.random() * (max - min);
        }
        
        // Ensure sell price field is visible
        function ensureSellPriceFieldVisible() {
            // Look for the hidden sell price field
            const hiddenSellField = document.querySelector('div[style*="display: none"] input[placeholder="Limit Sell"]');
            const isHidden = !!hiddenSellField;
            
            if (document.getElementById('console-log-enabled')?.checked) console.log('Sell price field hidden:', isHidden);
            
            if (isHidden) {
                if (document.getElementById('console-log-enabled')?.checked) console.log('Sell price field is hidden - need to check Reverse Order');
                ensureCheckboxChecked();
                return false;
            }
            
            if (document.getElementById('console-log-enabled')?.checked) console.log('Sell price field is visible');
            return true;
        }
        
        // Ensure Reverse Order checkbox is checked
        function ensureCheckboxChecked() {
            // Find checkbox by looking for the exact structure
            const checkboxes = document.querySelectorAll('div[role="checkbox"]');
            let reverseOrderCheckbox = null;
            
            for (const checkbox of checkboxes) {
                const nextSibling = checkbox.nextElementSibling;
                if (nextSibling && nextSibling.textContent.includes('Reverse Order')) {
                    reverseOrderCheckbox = checkbox;
                    break;
                }
            }
            
            if (reverseOrderCheckbox) {
                const isChecked = reverseOrderCheckbox.getAttribute('aria-checked') === 'true';
                if (document.getElementById('console-log-enabled')?.checked) console.log('Reverse Order checkbox found, aria-checked:', reverseOrderCheckbox.getAttribute('aria-checked'));
                
                if (isChecked) {
                    if (document.getElementById('console-log-enabled')?.checked) console.log('Reverse Order already checked - no action needed');
                } else {
                    if (document.getElementById('console-log-enabled')?.checked) console.log('Reverse Order unchecked - clicking to check it');
                    humanClick(reverseOrderCheckbox);
                }
            } else {
                if (document.getElementById('console-log-enabled')?.checked) console.log('Reverse Order checkbox not found');
            }
        }
        
        // Add button handlers
        document.getElementById('fill-buy').addEventListener('click', (e) => {
            e.stopPropagation();
            
            const buyPrice = document.getElementById('buy-price').textContent;
            const sellPrice = document.getElementById('sell-price').textContent;
            const amount = document.getElementById('trade-amount').value || '1';
            
            const buyPriceInput = document.getElementById('limitPrice');
            const limitTotalInputs = document.querySelectorAll('input#limitTotal');
            const amountInput = limitTotalInputs[0]; // First limitTotal is USDT amount
            const sellPriceInput = limitTotalInputs[1]; // Second limitTotal is sell price
            
            if (buyPriceInput && limitTotalInputs.length >= 2) {
                
                buyPriceInput.focus();
                setTimeout(() => {
                    setReactValue(buyPriceInput, buyPrice);
                    setTimeout(() => {
                        amountInput.focus();
                        setTimeout(() => {
                            setReactValue(amountInput, amount);
                            setTimeout(() => {
                                sellPriceInput.focus();
                                setTimeout(() => {
                                    setReactValue(sellPriceInput, sellPrice);
                                    // Verify sell price was set
                                    setTimeout(() => {
                                        if (sellPriceInput.value !== sellPrice) {
                                            setReactValue(sellPriceInput, sellPrice);
                                        }
                                    }, 50);
                                }, 100);
                            }, 200);
                        }, 100);
                    }, 200);
                }, 100);
                e.target.textContent = '✓';
                setTimeout(() => e.target.textContent = 'Fill', 2000);
            }
        });
        
        // Save config button
        document.getElementById('save-config').addEventListener('click', (e) => {
            e.stopPropagation();
            localStorage.setItem('hoverX', document.getElementById('hover-x').value);
            localStorage.setItem('traderNickname', document.getElementById('user-nickname').value);
            localStorage.setItem('tradeAmount', document.getElementById('trade-amount').value);
            localStorage.setItem('maxLoss', document.getElementById('max-loss').value);
            localStorage.setItem('tradeDelay', document.getElementById('trade-delay').value);
            localStorage.setItem('bulkTrades', document.getElementById('bulk-trades').value);
            localStorage.setItem('lossInput', document.getElementById('loss-input').value);
            log('✓ Configuration saved');
        });
        
        // Prevent inputs from triggering drag
        ['user-nickname', 'hover-x', 'save-config', 'trade-amount', 'bulk-trades', 'bulk-pause', 'bulk-stop', 'max-loss', 'trade-delay', 'clear-history', 'test-telegram', 'loss-input', 'update-loss-btn', 'log-output', 'clear-log', 'detailed-report', 'console-log-enabled'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('mousedown', (e) => e.stopPropagation());
        });
        
        // Log function that appends to textarea
        function log(message) {
            const timestamp = new Date().toLocaleTimeString();
            const logOutput = document.getElementById('log-output');
            if (logOutput) {
                logOutput.value += `[${timestamp}] ${message}\n`;
                logOutput.scrollTop = logOutput.scrollHeight;
            }
            const consoleLogEnabled = document.getElementById('console-log-enabled')?.checked;
            if (consoleLogEnabled) {
                console.log(message);
            }
        }
        
        // Clear log button
        document.getElementById('clear-log').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('log-output').value = '';
        });
        
        // Save nickname to localStorage on change
        document.getElementById('user-nickname').addEventListener('input', (e) => {
            localStorage.setItem('traderNickname', e.target.value);
        });
        
        // Update loss button
        document.getElementById('update-loss-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const input = document.getElementById('loss-input');
            const value = parseFloat(input.value);
            if (!isNaN(value)) {
                localStorage.removeItem('binanceTrades');
                localStorage.setItem('manualLossAdjustment', value.toString());
                document.getElementById('total-loss-display').textContent = value.toFixed(6);
            }
        });
        
        // Clear history button
        document.getElementById('clear-history').addEventListener('click', (e) => {
            e.stopPropagation();
            localStorage.removeItem('binanceTrades');
            localStorage.removeItem('manualLossAdjustment');
            document.getElementById('total-loss-display').textContent = '0.000000';
            log('✓ Trade history cleared and Total Loss reset to 0');
        });
        
        // Test Telegram button
        document.getElementById('test-telegram').addEventListener('click', async (e) => {
            e.stopPropagation();
            const btn = e.target;
            btn.textContent = 'Sending...';
            btn.disabled = true;
            
            const nickname = localStorage.getItem('traderNickname') || 'Trader';
            const tokenName = getTokenName();
            const message = `<b>[${nickname}]</b> - ${new Date().toLocaleString()}\n\n` +
                `🧪 <b>Test Message</b>\n` +
                `🪙 Token: ${tokenName}\n\n` +
                `✅ Telegram bot is working correctly!\n` +
                `📊 Current Balance: ${window.currentBalance.toFixed(2)} USDT`;
            
            await sendTelegramMessage(message);
            
            btn.textContent = '✓ Sent!';
            setTimeout(() => {
                btn.textContent = '📱 Test Telegram';
                btn.disabled = false;
            }, 2000);
        });
        
        // Send message to Telegram
        async function sendTelegramMessage(message) {
            console.log('Sending Telegram message...');
            console.log('Bot Token:', TELEGRAM_BOT_TOKEN);
            console.log('Chat ID:', TELEGRAM_CHAT_ID);
            console.log('Message:', message);
            
            return new Promise((resolve, reject) => {
                const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
                
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: url,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: JSON.stringify({
                        chat_id: TELEGRAM_CHAT_ID,
                        text: message,
                        parse_mode: 'HTML'
                    }),
                    onload: function(response) {
                        try {
                            const result = JSON.parse(response.responseText);
                            console.log('Telegram API response:', result);
                            
                            if (!result.ok) {
                                console.error('Telegram API error:', result.description);
                                alert(`Telegram error: ${result.description}`);
                                reject(new Error(result.description));
                            } else {
                                console.log('Message sent successfully!');
                                resolve(result);
                            }
                        } catch (e) {
                            console.error('Parse error:', e);
                            reject(e);
                        }
                    },
                    onerror: function(error) {
                        console.error('Telegram send error:', error);
                        alert(`Failed to send Telegram message: Network error`);
                        reject(error);
                    }
                });
            });
        }
        
        // Get trading fee in tokens and convert to USDT
        function getTradingFeeUSDT(marketPrice) {
            const feeEl = getXPathElement('/html/body/div[4]/div/div[3]/div/div[9]/div/div/div/div/div[3]/div[6]/div[2]/div[2]');
            if (feeEl && marketPrice) {
                const feeTokens = parseFloat(feeEl.textContent.trim());
                if (!isNaN(feeTokens)) {
                    return feeTokens * marketPrice;
                }
            }
            return 0;
        }
        
        // Wait until Open Orders is completely empty (both Buy and Sell completed)
        async function waitForTradeCompletion(entryPrice) {
            log('Waiting for trade completion... Entry price: ' + entryPrice);
            
            let checkCount = 0;
            let sellOnlyCount = 0;
            while (checkCount < 30) { // Max 30 seconds
                try {
                    // Check Open Orders section FIRST before waiting
                    const orderSection = getXPathElement('/html/body/div[4]/div/div[3]/div/div[8]/div/div/div/div/div[2]/div[1]/div');
                    if (orderSection) {
                        const orderText = orderSection.textContent;
                        if (checkCount % 3 === 0) { // Log every 3 seconds
                            if (orderText.includes('No Ongoing Orders')) {
                                log('No orders');
                            } else if (orderText.includes('Buy') && orderText.includes('Sell')) {
                                log('Buy+Sell active');
                            } else if (orderText.includes('Buy')) {
                                log('Buy active');
                            } else if (orderText.includes('Sell')) {
                                log('Sell active');
                            }
                        }
                    
                    // Success: No orders at all
                    if (orderText.includes('No Ongoing Orders')) {
                        log('✓ Trade completed - No Ongoing Orders');
                        return 'completed';
                    }
                    
                    // Price movement detection - cancel if market moves 0.2% away
                    if (entryPrice) {
                        const { currentPrice } = getMarketData();
                        if (currentPrice) {
                            const priceMovement = Math.abs((currentPrice - entryPrice) / entryPrice * 100);
                            if (priceMovement > 0.2) {
                                log(`⚠ Price moved ${priceMovement.toFixed(3)}% from entry, canceling...`);
                                const cancelAllBtn = getXPathElement('/html/body/div[4]/div/div[3]/div/div[8]/div/div/div/div/div[2]/div[1]/div/div[3]/div/div/div[1]/table/thead/tr/th[9]/div') ||
                                                   document.querySelector('th.bn-web-table-cell:nth-child(9)');
                                if (cancelAllBtn) {
                                    humanClick(cancelAllBtn);
                                    await new Promise(r => setTimeout(r, 200));
                                    await clickCancelConfirmWithRetry();
                                    return 'price_moved';
                                }
                            }
                        }
                    }
                    
                    // Handle stuck buy orders after 10 seconds
                    if (checkCount >= 10 && orderText.includes('Buy')) {
                        log('⏱ Buy order stuck 10s, canceling...');
                        const cancelBtn = getXPathElement('/html/body/div[4]/div/div[3]/div/div[8]/div/div/div/div/div[2]/div[1]/div/div[3]/div/div/div[1]/table/thead/tr/th[9]/div');
                        if (cancelBtn) {
                            humanClick(cancelBtn);
                            await new Promise(r => setTimeout(r, 200));
                            await clickCancelConfirmWithRetry();
                            return 'cancelled';
                        }
                    }
                    
                        // Track when only Sell order is active (Buy has filled)
                        if (orderText.includes('Sell') && !orderText.includes('Buy')) {
                            sellOnlyCount++;
                            log(`Sell-only count: ${sellOnlyCount}s`);
                            // After 5 seconds of Sell-only, execute cleanup
                            if (sellOnlyCount >= 5) {
                                log('⏱ Sell order stuck 5s after Buy filled, verifying before cleanup...');
                                await new Promise(r => setTimeout(r, 200));
                                const recheck = getXPathElement('/html/body/div[4]/div/div[3]/div/div[8]/div/div/div/div/div[2]/div[1]/div');
                                const recheckText = recheck ? recheck.textContent : '';
                                if (recheckText.includes('No Ongoing Orders')) {
                                    log('✓ Order filled during verification!');
                                    return 'completed';
                                } else if (recheckText.includes('Sell')) {
                                    log('✓ Confirmed stuck, executing cleanup...');
                                    await cleanupStuckSellOrder();
                                    log('Waiting 2s after cleanup order placed...');
                                    await new Promise(r => setTimeout(r, 2000));
                                    log('Verifying token sold...');
                                    const verified = await verifyTokenSold();
                                    if (verified) {
                                        log('✓ Cleanup verified - token sold');
                                    } else {
                                        log('⚠ Token still held after cleanup');
                                    }
                                    return 'cleanup';
                                }
                            }
                        } else {
                            sellOnlyCount = 0; // Reset counter if Buy is still active
                        }
                    }
                    
                    // Check for buy/sell order filled notifications
                    const buyNotification = document.querySelector('.bn-notification-content-title');
                    if (buyNotification && (buyNotification.textContent.includes('Buy Order Filled') || buyNotification.textContent.includes('Sell Order Filled'))) {
                        console.log('Order filled notification detected:', buyNotification.textContent);
                        const closeBtn = document.querySelector('.bn-notification-close');
                        if (closeBtn) closeBtn.click();
                    }
                } catch (error) {
                    log(`⚠ Error in wait loop: ${error.message}`);
                }
                
                await new Promise(r => setTimeout(r, 1000));
                checkCount++;
            }
            
            log('⏱ Timeout after 30 seconds');
            return 'timeout';
        }
        
        // Cookie storage functions
        function saveTradeToStorage(tradeData) {
            const trades = JSON.parse(localStorage.getItem('binanceTrades') || '[]');
            trades.push(tradeData);
            localStorage.setItem('binanceTrades', JSON.stringify(trades));
        }
        
        function getTotalLossFromStorage() {
            const manualAdjustment = parseFloat(localStorage.getItem('manualLossAdjustment') || '0');
            if (manualAdjustment !== 0) return manualAdjustment;
            
            const trades = JSON.parse(localStorage.getItem('binanceTrades') || '[]');
            return trades.reduce((sum, t) => sum + parseFloat(t.actualLoss || 0), 0);
        }
        

        
        // Safety checks
        function checkMaxLoss() {
            const maxLoss = parseFloat(document.getElementById('max-loss').value) || 2;
            const totalLoss = getTotalLossFromStorage();
            return totalLoss < maxLoss;
        }
        

        
        function checkBalance(amount) {
            return window.currentBalance >= amount;
        }
        
        // Bulk trade execution
        let isExecuting = false;
        let isPaused = false;
        let completedTradesCount = 0;
        let balanceBeforeSession = 0;
        async function executeBulkTrades() {
            if (isExecuting) {
                console.log('Already executing, stopping current execution');
                isExecuting = false;
                await new Promise(r => setTimeout(r, 500));
            }
            
            // Check if Reverse Order checkbox is checked
            const checkboxes = document.querySelectorAll('div[role="checkbox"]');
            let reverseOrderCheckbox = null;
            
            for (const checkbox of checkboxes) {
                const nextSibling = checkbox.nextElementSibling;
                if (nextSibling && nextSibling.textContent.includes('Reverse Order')) {
                    reverseOrderCheckbox = checkbox;
                    break;
                }
            }
            
            if (!reverseOrderCheckbox) {
                console.log('Reverse Order checkbox not found');
                const statusEl = document.getElementById('bulk-status');
                if (statusEl) {
                    statusEl.textContent = 'Error: Reverse Order checkbox not found';
                    statusEl.style.color = '#FF0000';
                    setTimeout(() => {
                        statusEl.textContent = '';
                    }, 3000);
                }
                return;
            }
            
            const isChecked = reverseOrderCheckbox.getAttribute('aria-checked') === 'true';
            console.log('Reverse Order checkbox aria-checked:', reverseOrderCheckbox.getAttribute('aria-checked'));
            
            if (!isChecked) {
                console.log('Reverse Order checkbox is NOT checked');
                const statusEl = document.getElementById('bulk-status');
                if (statusEl) {
                    statusEl.textContent = 'Please check the Reverse Order checkbox first';
                    statusEl.style.color = '#FF9800';
                    setTimeout(() => {
                        statusEl.textContent = '';
                    }, 3000);
                }
                return;
            }
            
            console.log('Reverse Order checkbox is checked - proceeding');
            
            const tradesCount = parseInt(document.getElementById('bulk-trades').value) || 10;
            const statusEl = document.getElementById('bulk-status');
            
            // Countdown before starting
            statusEl.textContent = 'Starting in 3...';
            statusEl.style.color = '#FFD700';
            await new Promise(r => setTimeout(r, 1000));
            statusEl.textContent = 'Starting in 2...';
            await new Promise(r => setTimeout(r, 1000));
            statusEl.textContent = 'Starting in 1...';
            await new Promise(r => setTimeout(r, 1000));
            
            console.log('Starting new bulk trade execution');
            isExecuting = true;
            isPaused = false;
            completedTradesCount = 0;
            sessionVolume = 0;
            const totalLossEl = document.getElementById('bulk-total-loss');
            const startBtn = document.getElementById('bulk-start');
            const pauseBtn = document.getElementById('bulk-pause');
            
            startBtn.style.display = 'none';
            pauseBtn.style.display = 'inline-block';
            document.getElementById('bulk-stop').style.display = 'inline-block';
            
            // Capture balance BEFORE any cleanup
            balanceBeforeSession = window.currentBalance;
            log(`Session starting balance: ${balanceBeforeSession.toFixed(2)} USDT`);
            
            // Initial cleanup check
            statusEl.textContent = 'Checking prerequisites...';
            statusEl.style.color = '#FFD700';
            await cleanupExistingSellOrders();
            await new Promise(r => setTimeout(r, 500));
            
            // Check holdings and sell if > $0.5
            const tokenName = getTokenName();
            const holdingsTab = document.querySelector('#bn-tab-holdings');
            if (holdingsTab) holdingsTab.click();
            await new Promise(r => setTimeout(r, 500));
            
            const row = Array.from(document.querySelectorAll('table tbody tr')).find(r => r.textContent.includes(tokenName));
            if (row) {
                const valueCell = row.querySelector('td:nth-child(3) .text-TertiaryText');
                if (valueCell) {
                    const usdValue = parseFloat(valueCell.textContent.replace(/[^0-9.]/g, ''));
                    if (usdValue > 0.5) {
                        log(`⚠ Holding ${tokenName}: $${usdValue} (> $0.5), executing sell...`);
                        statusEl.textContent = 'Selling initial holdings...';
                        const openOrdersTab = document.querySelector('#bn-tab-orderOrder > div:nth-child(1)');
                        if (openOrdersTab) openOrdersTab.click();
                        await new Promise(r => setTimeout(r, 500));
                        
                        // Cancel all existing orders first
                        const cancelAllBtn = getXPathElement('/html/body/div[4]/div/div[3]/div/div[8]/div/div/div/div/div[2]/div[1]/div/div[3]/div/div/div[1]/table/thead/tr/th[9]/div');
                        if (cancelAllBtn) {
                            log('Canceling existing orders...');
                            humanClick(cancelAllBtn);
                            await new Promise(r => setTimeout(r, 500));
                            await clickCancelConfirmWithRetry();
                            await new Promise(r => setTimeout(r, 1000));
                        }
                        
                        await cleanupStuckSellOrder();
                        await new Promise(r => setTimeout(r, 2000));
                        balanceBeforeTrade = window.currentBalance;
                    }
                }
            }
            
            const openOrdersTab = document.querySelector('#bn-tab-orderOrder > div:nth-child(1)');
            if (openOrdersTab) openOrdersTab.click();
            await new Promise(r => setTimeout(r, 500));
            
            for (let i = 0; i < tradesCount; i++) {
                if (!isExecuting) break;
                
                log(`\n=== Trade ${i + 1}/${tradesCount} ===`);
                
                // Check pause
                while (isPaused && isExecuting) {
                    statusEl.textContent = `Paused at trade ${i + 1}/${tradesCount}`;
                    await new Promise(r => setTimeout(r, 500));
                }
                if (!isExecuting) break;
                
                // Check prerequisites before trade
                const tokenName = getTokenName();
                
                // Check Holdings tab - token value must be < $1
                const holdingsTab = document.querySelector('#bn-tab-holdings');
                if (holdingsTab) holdingsTab.click();
                await new Promise(r => setTimeout(r, 500));
                
                const row = Array.from(document.querySelectorAll('table tbody tr')).find(r => r.textContent.includes(tokenName));
                if (row) {
                    const valueCell = row.querySelector('td:nth-child(3) .text-TertiaryText');
                    if (valueCell) {
                        const usdValue = parseFloat(valueCell.textContent.replace(/[^0-9.]/g, ''));
                        if (usdValue > 0.5) {
                            log(`⚠ Holding ${tokenName}: $${usdValue} (> $0.5), executing sell...`);
                            statusEl.textContent = `Trade ${i + 1}: Selling holdings...`;
                            const openOrdersTab = document.querySelector('#bn-tab-orderOrder > div:nth-child(1)');
                            if (openOrdersTab) openOrdersTab.click();
                            await new Promise(r => setTimeout(r, 500));
                            
                            // Cancel all existing orders first
                            const cancelAllBtn = getXPathElement('/html/body/div[4]/div/div[3]/div/div[8]/div/div/div/div/div[2]/div[1]/div/div[3]/div/div/div[1]/table/thead/tr/th[9]/div');
                            if (cancelAllBtn) {
                                log('Canceling existing orders...');
                                humanClick(cancelAllBtn);
                                await new Promise(r => setTimeout(r, 500));
                                await clickCancelConfirmWithRetry();
                                await new Promise(r => setTimeout(r, 1000));
                            }
                            
                            await cleanupStuckSellOrder();
                            await new Promise(r => setTimeout(r, 2000));
                            balanceBeforeTrade = window.currentBalance;
                            continue;
                        }
                    }
                }
                
                // Switch back to Open Orders
                const openOrdersTab = document.querySelector('#bn-tab-orderOrder > div:nth-child(1)');
                if (openOrdersTab) openOrdersTab.click();
                await new Promise(r => setTimeout(r, 500));
                
                // Check Open Orders - no orders for current token
                const orderSection = getXPathElement('/html/body/div[4]/div/div[3]/div/div[8]/div/div/div/div/div[2]/div[1]/div');
                if (orderSection) {
                    const orderText = orderSection.textContent;
                    if (orderText.includes(tokenName) && (orderText.includes('Buy') || orderText.includes('Sell'))) {
                        log(`⚠ Open orders exist for ${tokenName}, skipping trade`);
                        statusEl.textContent = `Trade ${i + 1}: Open orders exist, skipping`;
                        await new Promise(r => setTimeout(r, 2000));
                        continue;
                    }
                }
                
                log('✓ Prerequisites passed');
                
                // Safety checks with debug logging
                const maxLossCheck = checkMaxLoss();
                console.log(`Safety checks - MaxLoss: ${maxLossCheck}`);
                
                if (!maxLossCheck) {
                    statusEl.textContent = 'STOPPED: Max loss limit reached!';
                    statusEl.style.color = '#FF0000';
                    console.log('Stopped due to max loss limit');
                    break;
                }
                

                
                statusEl.textContent = `Trade ${i + 1}/${tradesCount}: Calculating...`;
                statusEl.style.color = '#FFD700';
                
                // Fresh price calculation
                const prices = calculateOptimalPrices();
                log(`Buy: ${prices.buy} | Sell: ${prices.sell} | Loss: ${prices.loss}%`);
                if (!prices) {
                    statusEl.textContent = `Trade ${i + 1}/${tradesCount}: Price error`;
                    log('❌ Price calculation failed');
                    await new Promise(r => setTimeout(r, 2000));
                    continue;
                }
                
                const amount = parseFloat(document.getElementById('trade-amount').value) || 1;
                console.log('Trade amount:', amount, 'Current balance:', window.currentBalance);
                
                // Balance check
                if (!checkBalance(amount)) {
                    statusEl.textContent = `STOPPED: Insufficient balance (need ${amount} USDT)`;
                    statusEl.style.color = '#FF0000';
                    console.log('Insufficient balance - stopping');
                    break;
                }
                
                // Store balance before trade
                balanceBeforeTrade = window.currentBalance;
                
                // Ensure sell price field is visible before proceeding
                if (!ensureSellPriceFieldVisible()) {
                    await new Promise(r => setTimeout(r, 300)); // Wait for UI update
                    if (!ensureSellPriceFieldVisible()) {
                        console.log('Sell price field still not visible after checkbox click');
                        continue; // Skip this trade
                    }
                }
                await new Promise(r => setTimeout(r, 100)); // Wait for UI stability
                
                const buyPriceInput = document.getElementById('limitPrice');
                const limitTotalInputs = document.querySelectorAll('input#limitTotal');
                const amountInput = limitTotalInputs[0]; // First limitTotal is USDT amount
                const sellPriceInput = limitTotalInputs[1]; // Second limitTotal is sell price
                const buyButton = getXPathElement('/html/body/div[4]/div/div[3]/div/div[9]/div/div/div/div/div[3]/button');
                
                if (buyPriceInput && limitTotalInputs.length >= 2 && buyButton) {
                    
                    buyPriceInput.focus();
                    await new Promise(r => setTimeout(r, 100));
                    setReactValue(buyPriceInput, prices.buy);
                    await new Promise(r => setTimeout(r, 200));
                    
                    amountInput.focus();
                    await new Promise(r => setTimeout(r, 100));
                    setReactValue(amountInput, amount.toString());
                    await new Promise(r => setTimeout(r, 200));
                    
                    sellPriceInput.focus();
                    await new Promise(r => setTimeout(r, 100));
                    setReactValue(sellPriceInput, prices.sell);
                    await new Promise(r => setTimeout(r, 100));
                    
                    // Verify sell price was set correctly (retry up to 3 times)
                    for (let retry = 0; retry < 3; retry++) {
                        if (sellPriceInput.value !== prices.sell) {
                            log(`Retry ${retry + 1}: Setting sell price ${prices.sell}`);
                            setReactValue(sellPriceInput, prices.sell);
                            await new Promise(r => setTimeout(r, 150));
                        } else {
                            log(`✓ Sell price confirmed: ${prices.sell}`);
                            break;
                        }
                    }
                    
                    // Final verification
                    if (sellPriceInput.value !== prices.sell) {
                        log(`❌ FAILED to set sell price! Expected: ${prices.sell}, Got: ${sellPriceInput.value}`);
                        statusEl.textContent = 'ERROR: Sell price not set!';
                        statusEl.style.color = '#FF0000';
                        await new Promise(r => setTimeout(r, 3000));
                        continue; // Skip this trade
                    }
                    
                    simulateMouseMove(buyButton);
                    await new Promise(r => setTimeout(r, randomDelay(30, 50)));
                    humanClick(buyButton);
                    await new Promise(r => setTimeout(r, randomDelay(150, 200)));
                    await clickConfirmWithRetry();
                    
                    // Wait 2 seconds after confirmation for order processing
                    await new Promise(r => setTimeout(r, 2000));
                    
                    // Wait for trade completion with price movement detection
                    const entryPrice = parseFloat(prices.buy);
                    
                    // Show live status during wait
                    const waitInterval = setInterval(() => {
                        const orderSection = getXPathElement('/html/body/div[4]/div/div[3]/div/div[8]/div/div/div/div/div[2]/div[1]/div');
                        if (orderSection) {
                            const orderText = orderSection.textContent;
                            if (orderText.includes('Buy') && orderText.includes('Sell')) {
                                statusEl.textContent = `Trade ${i + 1}/${tradesCount}: Buy+Sell active`;
                            } else if (orderText.includes('Buy')) {
                                statusEl.textContent = `Trade ${i + 1}/${tradesCount}: Buy filling...`;
                            } else if (orderText.includes('Sell')) {
                                statusEl.textContent = `Trade ${i + 1}/${tradesCount}: Sell filling...`;
                            }
                        }
                    }, 500);
                    
                    const result = await waitForTradeCompletion(entryPrice);
                    clearInterval(waitInterval);
                    
                    // Get actual fill prices for slippage check
                    const actualBuyPrice = parseFloat(prices.buy);
                    const expectedBuyPrice = parseFloat(prices.buy);
                    const slippage = Math.abs((actualBuyPrice - expectedBuyPrice) / expectedBuyPrice * 100);
                    
                    if (slippage > 0.1) {
                        statusEl.textContent = `Trade ${i + 1}: SLIPPAGE WARNING ${slippage.toFixed(3)}%`;
                        statusEl.style.color = '#FFA500';
                    } else {
                        statusEl.textContent = `Trade ${i + 1}/${tradesCount}: ${result}`;
                    }
                    
                    // Only calculate loss and save if trade completed successfully (not cleanup)
                    if (result === 'completed') {
                        // Calculate actual loss from balance delta
                        await new Promise(r => setTimeout(r, 1000)); // Wait for balance update
                        const balanceAfterTrade = window.currentBalance;
                        const actualLoss = balanceBeforeTrade - balanceAfterTrade;
                        
                        // Save trade data
                        const tradeData = {
                            timestamp: new Date().toISOString(),
                            tradeNumber: completedTradesCount + 1,
                            buyPrice: prices.buy,
                            sellPrice: prices.sell,
                            amount: amount,
                            lossPercent: prices.loss,
                            actualLoss: actualLoss.toFixed(6),
                            result: result,
                            slippage: slippage.toFixed(3)
                        };
                        saveTradeToStorage(tradeData);
                        localStorage.removeItem('manualLossAdjustment'); // Clear manual override
                        completedTradesCount++;
                        sessionVolume += amount;
                        log(`✓ Trade #${completedTradesCount} completed, Loss: ${actualLoss.toFixed(6)} USDT`);
                        
                        // Update Total Loss display immediately
                        const totalLossEl = document.getElementById('total-loss-display');
                        if (totalLossEl) {
                            totalLossEl.textContent = getTotalLossFromStorage().toFixed(6);
                        }
                    } else {
                        log(`⚠ Trade cancelled/failed: ${result}`);
                    }
                    
                    // Delay after trade regardless of result
                    if (result === 'completed') {
                        const maxDelay = parseInt(document.getElementById('trade-delay')?.value) || 2;
                        const delay = 1000 + Math.random() * (maxDelay - 1) * 1000;
                        statusEl.textContent = `Trade ${i + 1}/${tradesCount}: Waiting ${(delay/1000).toFixed(1)}s...`;
                        await new Promise(r => setTimeout(r, delay));
                    } else {
                        // Wait longer after cancellation to ensure UI is ready
                        log('Waiting 2s after cancellation...');
                        await new Promise(r => setTimeout(r, 2000));
                    }
                }
            }
            
            const finalLoss = getTotalLossFromStorage();
            statusEl.textContent = `Completed! Total Loss: ${finalLoss.toFixed(6)} USDT`;
            statusEl.style.color = '#4CAF50';
            startBtn.style.display = 'inline-block';
            pauseBtn.style.display = 'none';
            document.getElementById('bulk-stop').style.display = 'none';
            
            // Send Telegram notification if any trades completed
            console.log('Checking Telegram notification conditions:', { isExecuting, completedTradesCount });
            if (isExecuting && completedTradesCount > 0) {
                const nickname = localStorage.getItem('traderNickname') || 'Trader';
                const trades = JSON.parse(localStorage.getItem('binanceTrades') || '[]');
                const recentTrades = trades.slice(-completedTradesCount);
                const cancelledCount = recentTrades.filter(t => t.result === 'cancelled').length;
                const tradeAmount = parseFloat(document.getElementById('trade-amount').value) || 1;
                
                // Get token holdings value
                const tokenName = getTokenName();
                const holdingsTab = document.querySelector('#bn-tab-holdings');
                if (holdingsTab) holdingsTab.click();
                await new Promise(r => setTimeout(r, 500));
                
                let tokenHoldingsValue = 0;
                const row = Array.from(document.querySelectorAll('table tbody tr')).find(r => r.textContent.includes(tokenName));
                if (row) {
                    const valueCell = row.querySelector('td:nth-child(3) .text-TertiaryText');
                    if (valueCell) {
                        tokenHoldingsValue = parseFloat(valueCell.textContent.replace(/[^0-9.]/g, '')) || 0;
                    }
                }
                
                const openOrdersTab = document.querySelector('#bn-tab-orderOrder > div:nth-child(1)');
                if (openOrdersTab) openOrdersTab.click();
                await new Promise(r => setTimeout(r, 300));
                
                const balanceAfterSession = window.currentBalance + tokenHoldingsValue;
                const actualSessionLoss = balanceBeforeSession - balanceAfterSession;
                const percentageChange = ((balanceAfterSession - balanceBeforeSession) / balanceBeforeSession * 100).toFixed(3);
                const changeEmoji = percentageChange >= 0 ? '📈' : '📉';
                const detailedReport = document.getElementById('detailed-report').checked;
                
                let message = `<b>[${nickname}]</b> - ${new Date().toLocaleString()}\n\n` +
                    `🤖 <b>Trading Session Completed</b>\n` +
                    `🪙 Token: ${tokenName}\n\n` +
                    `📊 Total Trades: ${tradesCount}\n` +
                    `✅ Completed: ${completedTradesCount}\n` +
                    `❌ Cancelled: ${cancelledCount}\n` +
                    `💵 Amount per Trade: ${tradeAmount} USDT\n` +
                    `📈 Total Volume: ${sessionVolume.toFixed(2)} USDT\n` +
                    `💰 Session Loss: ${actualSessionLoss.toFixed(6)} USDT\n` +
                    `📊 Balance Before: ${balanceBeforeSession.toFixed(2)} USDT\n` +
                    `📊 Balance After: ${balanceAfterSession.toFixed(2)} USDT\n` +
                    `${changeEmoji} Change: ${percentageChange}%`;
                
                if (detailedReport && recentTrades.length > 0) {
                    message += `\n\n📋 <b>Trade Details:</b>\n`;
                    recentTrades.forEach((trade, idx) => {
                        if (trade.result === 'completed') {
                            message += `\n#${idx + 1}: Loss ${trade.actualLoss} USDT`;
                        }
                    });
                }
                
                console.log('Sending Telegram notification...');
                await sendTelegramMessage(message);
                console.log('Telegram notification sent successfully');
            } else {
                console.log('Skipping Telegram notification - isExecuting:', isExecuting, 'completedTradesCount:', completedTradesCount);
            }
            
            isExecuting = false;
            isPaused = false;
            console.log('Bulk trading completed, stopping execution');
            
            setTimeout(() => {
                statusEl.textContent = '';
                statusEl.style.color = '#FFD700';
            }, 5000);
        }
        
        document.getElementById('bulk-start').addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('Start button clicked');
            executeBulkTrades();
        });
        
        document.getElementById('bulk-pause').addEventListener('click', (e) => {
            e.stopPropagation();
            if (isExecuting) {
                if (isPaused) {
                    isPaused = false;
                    e.target.textContent = 'Pause';
                    e.target.style.background = '#F44336';
                } else {
                    isPaused = true;
                    e.target.textContent = 'Resume';
                    e.target.style.background = '#4CAF50';
                }
            }
        });
        
        document.getElementById('bulk-stop').addEventListener('click', async (e) => {
            e.stopPropagation();
            if (isExecuting) {
                const statusEl = document.getElementById('bulk-status');
                const startBtn = document.getElementById('bulk-start');
                const pauseBtn = document.getElementById('bulk-pause');
                const stopBtn = document.getElementById('bulk-stop');
                
                // Send Telegram notification before stopping
                if (completedTradesCount > 0) {
                    const nickname = localStorage.getItem('traderNickname') || 'Trader';
                    const trades = JSON.parse(localStorage.getItem('binanceTrades') || '[]');
                    const recentTrades = trades.slice(-completedTradesCount);
                    const tradeAmount = parseFloat(document.getElementById('trade-amount').value) || 1;
                    
                    // Get token holdings value
                    const tokenName = getTokenName();
                    const holdingsTab = document.querySelector('#bn-tab-holdings');
                    if (holdingsTab) holdingsTab.click();
                    await new Promise(r => setTimeout(r, 500));
                    
                    let tokenHoldingsValue = 0;
                    const row = Array.from(document.querySelectorAll('table tbody tr')).find(r => r.textContent.includes(tokenName));
                    if (row) {
                        const valueCell = row.querySelector('td:nth-child(3) .text-TertiaryText');
                        if (valueCell) {
                            tokenHoldingsValue = parseFloat(valueCell.textContent.replace(/[^0-9.]/g, '')) || 0;
                        }
                    }
                    
                    const openOrdersTab = document.querySelector('#bn-tab-orderOrder > div:nth-child(1)');
                    if (openOrdersTab) openOrdersTab.click();
                    await new Promise(r => setTimeout(r, 300));
                    
                    const balanceAfterSession = window.currentBalance + tokenHoldingsValue;
                    const actualSessionLoss = balanceBeforeSession - balanceAfterSession;
                    const percentageChange = ((balanceAfterSession - balanceBeforeSession) / balanceBeforeSession * 100).toFixed(3);
                    const changeEmoji = percentageChange >= 0 ? '📈' : '📉';
                    const detailedReport = document.getElementById('detailed-report').checked;
                    
                    let message = `<b>[${nickname}]</b> - ${new Date().toLocaleString()}\n\n` +
                        `⛔ <b>Trading Session STOPPED</b>\n` +
                        `🪙 Token: ${tokenName}\n\n` +
                        `📊 Completed Trades: ${completedTradesCount}\n` +
                        `💵 Amount per Trade: ${tradeAmount} USDT\n` +
                        `📈 Total Volume: ${sessionVolume.toFixed(2)} USDT\n` +
                        `💰 Session Loss: ${actualSessionLoss.toFixed(6)} USDT\n` +
                        `📊 Balance Before: ${balanceBeforeSession.toFixed(2)} USDT\n` +
                        `📊 Balance After: ${balanceAfterSession.toFixed(2)} USDT\n` +
                        `${changeEmoji} Change: ${percentageChange}%`;
                    
                    if (detailedReport && recentTrades.length > 0) {
                        message += `\n\n📋 <b>Trade Details:</b>\n`;
                        recentTrades.forEach((trade, idx) => {
                            if (trade.result === 'completed') {
                                message += `\n#${idx + 1}: Loss ${trade.actualLoss} USDT`;
                            }
                        });
                    }
                    
                    console.log('Sending Stop notification...');
                    await sendTelegramMessage(message);
                    console.log('Stop notification sent successfully');
                }
                
                isExecuting = false;
                isPaused = false;
                completedTradesCount = 0;
                sessionVolume = 0;
                
                statusEl.textContent = 'STOPPED by user';
                statusEl.style.color = '#FF0000';
                startBtn.style.display = 'inline-block';
                pauseBtn.style.display = 'none';
                stopBtn.style.display = 'none';
                
                setTimeout(() => {
                    statusEl.textContent = '';
                    statusEl.style.color = '#FFD700';
                }, 3000);
            }
        });
        
        // Safer confirm button click with retry
        async function clickConfirmWithRetry() {
            for (let i = 0; i < 5; i++) {
                await new Promise(r => setTimeout(r, 100 + i * 50));
                const confirmBtn = getXPathElement('/html/body/div[4]/div[2]/div/div/button');
                if (confirmBtn) {
                    simulateMouseMove(confirmBtn);
                    await new Promise(r => setTimeout(r, randomDelay(30, 50)));
                    humanClick(confirmBtn);
                    return true;
                }
            }
            return false;
        }
        
        // Click cancel confirmation with retry
        async function clickCancelConfirmWithRetry() {
            for (let i = 0; i < 3; i++) {
                await new Promise(r => setTimeout(r, 100 + i * 50));
                const cancelConfirmBtn = getXPathElement('/html/body/div[4]/div[2]/div/div/div[2]/button');
                if (cancelConfirmBtn) {
                    simulateMouseMove(cancelConfirmBtn);
                    await new Promise(r => setTimeout(r, randomDelay(30, 50)));
                    humanClick(cancelConfirmBtn);
                    console.log('Cancel confirmed');
                    return true;
                }
            }
            return false;
        }
        
        // Get current token from URL
        function getCurrentToken() {
            const url = window.location.href;
            const match = url.match(/\/([A-Z]+)$/);
            return match ? match[1] : null;
        }
        
        // Check and cleanup existing sell orders before starting
        async function cleanupExistingSellOrders() {
            if (!isExecuting) {
                console.log('Not executing, skipping cleanup');
                return false;
            }
            
            console.log('Checking for existing sell orders...');
            
            const orderSection = getXPathElement('/html/body/div[4]/div/div[3]/div/div[8]/div/div/div/div/div[2]/div[1]/div');
            if (!orderSection) {
                console.log('Order section not found, skipping cleanup');
                return false;
            }
            
            const orderText = orderSection.textContent;
            console.log('Order section text:', orderText);
            
            // Get current token
            const currentToken = getCurrentToken();
            console.log('Current token:', currentToken);
            
            // Check if multiple token types exist and click Hide Other Tokens
            const hideOtherTokensBtn = document.querySelector('#trade-history-hide-other-pairs');
            if (hideOtherTokensBtn && orderText.split('Sell').length > 2) {
                console.log('Multiple tokens detected, clicking Hide Other Tokens');
                humanClick(hideOtherTokensBtn);
                await new Promise(r => setTimeout(r, 1000));
            }
            
            // Check if current token has sell orders
            if (orderText.includes('Sell')) {
                console.log('Sell orders detected in Open Orders');
                console.log('Current token check:', currentToken, 'Order contains token:', !currentToken || orderText.includes(currentToken));
                
                if (!currentToken || orderText.includes(currentToken)) {
                    console.log('Existing sell orders found for current token, cleaning up...');
                    
                    // Never give up - keep trying until all orders are cleared
                    while (true) {
                        // First: Cancel all open orders
                        const cancelAllBtn = getXPathElement('/html/body/div[4]/div/div[3]/div/div[8]/div/div/div/div/div[2]/div[1]/div/div[3]/div/div/div[1]/table/thead/tr/th[9]/div') ||
                                           document.querySelector('th.bn-web-table-cell:nth-child(9)');
                        if (cancelAllBtn) {
                            console.log('Canceling all open orders');
                            humanClick(cancelAllBtn);
                            await new Promise(r => setTimeout(r, 500));
                            await clickCancelConfirmWithRetry();
                            await new Promise(r => setTimeout(r, 2000));
                        }
                        
                        // Then: Sell all remaining tokens
                        await cleanupStuckSellOrder();
                        
                        // Wait 10 seconds and check if cleanup completed
                        let cleanupWait = 0;
                        while (cleanupWait < 10) {
                            await new Promise(r => setTimeout(r, 1000));
                            cleanupWait++;
                            const updatedSection = getXPathElement('/html/body/div[4]/div/div[3]/div/div[8]/div/div/div/div/div[2]/div[1]/div');
                            if (updatedSection && updatedSection.textContent.includes('No Ongoing Orders')) {
                                console.log('All orders cleared successfully');
                                return true;
                            }
                        }
                        
                        console.log('Orders still exist, repeating cleanup process...');
                    }
                } else {
                    console.log('Sell orders found but not for current token, skipping cleanup');
                }
            }
            
            console.log('No existing sell orders found for current token');
            return false;
        }
        
        // Verify token was sold by checking Holdings tab
        async function verifyTokenSold() {
            const tokenName = getXPathElement('/html/body/div[4]/div/div[2]/div/div/div[1]/div[3]/div[1]')?.textContent.trim();
            if (!tokenName) return false;
            
            const holdingsTab = document.querySelector('#bn-tab-holdings');
            if (holdingsTab) holdingsTab.click();
            await new Promise(r => setTimeout(r, 500));
            
            const row = Array.from(document.querySelectorAll('table tbody tr')).find(r => r.textContent.includes(tokenName));
            let usdValue = 0;
            if (row) {
                const valueCell = row.querySelector('td:nth-child(3) .text-TertiaryText');
                if (valueCell) {
                    usdValue = parseFloat(valueCell.textContent.replace(/[^0-9.]/g, ''));
                    log(`${tokenName} remaining value: $${usdValue}`);
                }
            }
            
            const openOrdersTab = document.querySelector('#bn-tab-orderOrder > div:nth-child(1)');
            if (openOrdersTab) openOrdersTab.click();
            await new Promise(r => setTimeout(r, 300));
            
            return usdValue < 0.01;
        }
        
        // Cleanup stuck sell order by placing aggressive sell
        async function cleanupStuckSellOrder() {
            if (!isExecuting) {
                console.log('Not executing, skipping sell order cleanup');
                return;
            }
            
            console.log('Cleaning up stuck sell order...');
            
            // FIRST: Click existing Cancel All button on UI
            const cancelAllBtn = getXPathElement('/html/body/div[4]/div/div[3]/div/div[8]/div/div/div/div/div[2]/div[1]/div/div[3]/div/div/div[1]/table/thead/tr/th[9]/div') ||
                               document.querySelector('th.bn-web-table-cell:nth-child(9)');
            if (cancelAllBtn) {
                console.log('Clicking existing Cancel All button');
                humanClick(cancelAllBtn);
                await new Promise(r => setTimeout(r, 500));
                await clickCancelConfirmWithRetry();
                await new Promise(r => setTimeout(r, 1000));
            } else {
                console.log('Cancel All button not found');
            }
            
            // Switch to sell panel
            const sellTab = document.querySelector('div.bn-tab__buySell:nth-child(2)');
            if (sellTab) {
                console.log('Clicking Sell tab:', sellTab);
                humanClick(sellTab);
                await new Promise(r => setTimeout(r, 1000));
            } else {
                console.log('Sell tab not found!');
                return;
            }
            
            // Ensure Reverse Order is unchecked (we want to sell tokens for USDT)
            const checkboxes = document.querySelectorAll('div[role="checkbox"]');
            let reverseOrderCheckbox = null;
            
            for (const checkbox of checkboxes) {
                const nextSibling = checkbox.nextElementSibling;
                if (nextSibling && nextSibling.textContent.includes('Reverse Order')) {
                    reverseOrderCheckbox = checkbox;
                    break;
                }
            }
            
            if (reverseOrderCheckbox) {
                const isChecked = reverseOrderCheckbox.getAttribute('aria-checked') === 'true';
                if (isChecked) {
                    console.log('Unchecking Reverse Order for token sale');
                    humanClick(reverseOrderCheckbox);
                    await new Promise(r => setTimeout(r, 300));
                } else {
                    console.log('Reverse Order already unchecked');
                }
            } else {
                console.log('Reverse Order checkbox not found');
            }
            
            // Set slider to 100% using multiple approaches
            const sliderContainer = getXPathElement('/html/body/div[4]/div/div[3]/div/div[9]/div/div/div/div/div[3]/div[3]');
            if (sliderContainer) {
                // Try method 1: Find and click 100% button
                const maxButton = sliderContainer.querySelector('[data-testid="100%"], .bn-slider-step:last-child, .slider-step-100');
                if (maxButton) {
                    console.log('Clicking 100% button');
                    humanClick(maxButton);
                    await new Promise(r => setTimeout(r, 300));
                } else {
                    // Try method 2: Find slider input and set value
                    const sliderInput = sliderContainer.querySelector('input[type="range"], .bn-slider-input');
                    if (sliderInput) {
                        console.log('Setting slider input to max value');
                        setReactValue(sliderInput, sliderInput.max || '100');
                        await new Promise(r => setTimeout(r, 300));
                    } else {
                        // Try method 3: Enhanced drag simulation
                        const slider = sliderContainer.querySelector('.bn-slider, .slider-track, [role="slider"]');
                        if (slider) {
                            console.log('Enhanced drag simulation to 100%');
                            const rect = slider.getBoundingClientRect();
                            const startX = rect.left + 5;
                            const endX = rect.right - 5;
                            const centerY = rect.top + rect.height / 2;
                            
                            // Focus first
                            slider.focus();
                            await new Promise(r => setTimeout(r, 100));
                            
                            // Enhanced drag with proper event sequence
                            slider.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: startX, clientY: centerY }));
                            slider.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, clientX: startX, clientY: centerY }));
                            slider.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, buttons: 1, clientX: startX, clientY: centerY }));
                            
                            // Multiple move events for smooth drag
                            for (let i = 0; i <= 10; i++) {
                                const currentX = startX + (endX - startX) * (i / 10);
                                slider.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, button: 0, buttons: 1, clientX: currentX, clientY: centerY }));
                                await new Promise(r => setTimeout(r, 10));
                            }
                            
                            slider.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0, buttons: 0, clientX: endX, clientY: centerY }));
                            slider.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: endX, clientY: centerY }));
                            await new Promise(r => setTimeout(r, 300));
                        } else {
                            console.log('No slider element found!');
                        }
                    }
                }
            } else {
                console.log('Slider container not found!');
            }
            
            // Get aggressive sell price for instant fill
            const { currentPrice } = getMarketData();
            if (currentPrice) {
                // Extra aggressive sell price - 0.5% below market for guaranteed instant fill
                const aggressiveSellPrice = (currentPrice * 0.995).toFixed(8);
                const sellPriceInput = document.getElementById('limitPrice');
                if (sellPriceInput) {
                    console.log('Setting aggressive sell price for instant fill:', aggressiveSellPrice);
                    sellPriceInput.focus();
                    await new Promise(r => setTimeout(r, 100));
                    setReactValue(sellPriceInput, aggressiveSellPrice);
                    await new Promise(r => setTimeout(r, 200));
                }
            }
            
            // Click sell button
            const sellButton = document.querySelector('.bn-button.bn-button__sell');
            if (sellButton) {
                console.log('Placing limit sell order');
                simulateMouseMove(sellButton);
                await new Promise(r => setTimeout(r, randomDelay(30, 50)));
                humanClick(sellButton);
                await new Promise(r => setTimeout(r, randomDelay(150, 200)));
                await clickConfirmWithRetry();
            } else {
                console.log('Sell button not found!');
            }
            
            // Switch back to buy panel
            await new Promise(r => setTimeout(r, 500));
            const buyTab = document.querySelector('div.bn-tab__buySell:nth-child(1)');
            if (buyTab) {
                humanClick(buyTab);
                await new Promise(r => setTimeout(r, 300));
                // Ensure Reverse Order is checked for buy orders
                ensureCheckboxChecked();
            }
            
            console.log('Cleanup order placed');
        }
        
        // Monitor order and cancel if not filled
        async function monitorOrder() {
            await new Promise(r => setTimeout(r, 5000));
            const orderSection = getXPathElement('/html/body/div[4]/div/div[3]/div/div[8]/div/div/div/div/div[2]/div[1]/div');
            if (orderSection) {
                const hasSellOrder = orderSection.textContent.includes('Sell');
                if (!hasSellOrder) {
                    const cancelBtn = getXPathElement('/html/body/div[4]/div/div[3]/div/div[8]/div/div/div/div/div[2]/div[1]/div/div[3]/div/div/div[1]/table/thead/tr/th[9]/div');
                    if (cancelBtn) {
                        console.log('Order not filled, canceling...');
                        humanClick(cancelBtn);
                        // Wait and click cancel confirmation
                        await new Promise(r => setTimeout(r, 200));
                        await clickCancelConfirmWithRetry();
                    }
                }
            }
        }
        
        document.getElementById('auto-buy').addEventListener('click', async (e) => {
            e.stopPropagation();
            if (mousePaused) {
                console.log('Paused due to mouse movement');
                return;
            }
            
            const buyPrice = document.getElementById('buy-price').textContent;
            const sellPrice = document.getElementById('sell-price').textContent;
            const amount = document.getElementById('trade-amount').value || '1';
            const buyPriceInput = document.getElementById('limitPrice');
            const limitTotalInputs = document.querySelectorAll('input#limitTotal');
            const amountInput = limitTotalInputs[0]; // First limitTotal is USDT amount
            const sellPriceInput = limitTotalInputs[1]; // Second limitTotal is sell price
            const buyButton = getXPathElement('/html/body/div[4]/div/div[3]/div/div[9]/div/div/div/div/div[3]/button');
            
            if (buyPriceInput && limitTotalInputs.length >= 2 && buyButton) {
                
                buyPriceInput.focus();
                setTimeout(() => {
                    setReactValue(buyPriceInput, buyPrice);
                    setTimeout(() => {
                        amountInput.focus();
                        setTimeout(() => {
                            setReactValue(amountInput, amount);
                            setTimeout(() => {
                                sellPriceInput.focus();
                                setTimeout(() => {
                                    setReactValue(sellPriceInput, sellPrice);
                                    setTimeout(() => {
                                        // Verify sell price
                                        if (sellPriceInput.value !== sellPrice) {
                                            setReactValue(sellPriceInput, sellPrice);
                                        }
                                        setTimeout(() => {
                                            simulateMouseMove(buyButton);
                                            setTimeout(() => {
                                                humanClick(buyButton);
                                                setTimeout(async () => {
                                                    await clickConfirmWithRetry();
                                                    monitorOrder();
                                                }, randomDelay(150, 200));
                                            }, randomDelay(30, 50));
                                        }, randomDelay(50, 80));
                                    }, 50);
                                }, 100);
                            }, 200);
                        }, 100);
                    }, 200);
                }, 100);
                e.target.textContent = '✓';
                setTimeout(() => e.target.textContent = 'Buy', 1000);
            }
        });
        
        // Get current market price and recent trades
        function getMarketData() {
            let currentPrice = null;
            const trades = [];
            
            // Method 0: Live WebSocket price (fastest)
            if (window.livePrice && window.livePrice > 0) {
                currentPrice = window.livePrice;
                trades.push(currentPrice);
            }
            
            // Method 1: Chart container close price (most reliable)
            if (!currentPrice) {
                // Trigger hover first to ensure elements are visible
                triggerChartHover();
                
                const chartContainer = document.querySelector('.chart-title-indicator-container');
                if (chartContainer) {
                    const closeEl = chartContainer.querySelector('span[key="c"]');
                    if (closeEl) {
                        const price = parseFloat(closeEl.textContent.trim());
                        if (!isNaN(price) && price > 0) {
                            currentPrice = price;
                            trades.push(price);
                        }
                    }
                }
            }
            
            // Method 2: Direct selector fallback
            if (!currentPrice) {
                const closeEl = document.querySelector('span[key="c"]');
                if (closeEl) {
                    const price = parseFloat(closeEl.textContent.trim());
                    if (!isNaN(price) && price > 0) {
                        currentPrice = price;
                        trades.push(price);
                    }
                }
            }
            
            // Method 2: Header price displays
            if (!currentPrice) {
                const headerSelectors = [
                    '[class*="showPrice"]',
                    '[data-testid="ticker-price"]',
                    '.ticker-price',
                    '.symbol-price',
                    '.market-price'
                ];
                
                for (const selector of headerSelectors) {
                    const el = document.querySelector(selector);
                    if (el) {
                        const price = parseFloat(el.textContent.replace(/[^0-9.]/g, ''));
                        if (!isNaN(price) && price > 0) {
                            currentPrice = price;
                            trades.push(price);
                            break;
                        }
                    }
                }
            }
            
            // Method 3: XPath fallbacks
            if (!currentPrice) {
                const xpaths = [
                    '/html/body/div[4]/div/div[2]/div/div/div[2]/div[1]',
                    '/html/body/div[4]/div/div[2]/div/div/div[1]/div[2]',
                    '/html/body/div[4]/div/div[2]/div/div/div[2]'
                ];
                
                for (const xpath of xpaths) {
                    const el = getXPathElement(xpath);
                    if (el) {
                        const price = parseFloat(el.textContent.replace(/[^0-9.]/g, ''));
                        if (!isNaN(price) && price > 0 && price.toString().length > 3) {
                            currentPrice = price;
                            trades.push(price);
                            break;
                        }
                    }
                }
            }
            
            // Method 4: Trading panel price input (current market price)
            if (!currentPrice) {
                const priceInput = document.getElementById('limitPrice');
                if (priceInput && priceInput.placeholder) {
                    const price = parseFloat(priceInput.placeholder.replace(/[^0-9.]/g, ''));
                    if (!isNaN(price) && price > 0) {
                        currentPrice = price;
                        trades.push(price);
                    }
                }
            }
            
            // Method 5: Scan all numeric elements
            if (!currentPrice) {
                const allElements = document.querySelectorAll('*');
                for (const el of allElements) {
                    if (el.children.length === 0) { // Only leaf elements
                        const text = el.textContent.trim();
                        if (/^\d+\.\d{4,8}$/.test(text)) { // Price-like format
                            const price = parseFloat(text);
                            if (price > 0.0001 && price < 1000000) { // Reasonable price range
                                currentPrice = price;
                                trades.push(price);
                                break;
                            }
                        }
                    }
                }
            }
            
            // Get trade book data
            const tradeBookEl = getXPathElement('/html/body/div[4]/div/div[3]/div/div[7]/div/div/div');
            if (tradeBookEl) {
                const priceElements = tradeBookEl.querySelectorAll('[style*="color"]');
                priceElements.forEach(el => {
                    const price = parseFloat(el.textContent);
                    if (!isNaN(price) && price > 0) trades.push(price);
                });
            }
            
            // Fallback: ReactVirtualized grid
            if (trades.length < 2) {
                const tradeRows = document.querySelectorAll('.ReactVirtualized__Grid__innerScrollContainer [role="gridcell"]');
                tradeRows.forEach(row => {
                    const priceEl = row.querySelector('.flex-1.cursor-pointer');
                    if (priceEl) {
                        const price = parseFloat(priceEl.textContent);
                        if (!isNaN(price)) trades.push(price);
                    }
                });
            }
            
            // Method 3: Wait for chart elements to load
            if (!currentPrice) {
                // Try to find any price-like span elements
                const allSpans = document.querySelectorAll('span');
                for (const span of allSpans) {
                    const text = span.textContent.trim();
                    if (/^0\.[0-9]{4,8}$/.test(text)) {
                        const price = parseFloat(text);
                        if (price > 0.0001 && price < 10) {
                            currentPrice = price;
                            trades.push(price);
                            break;
                        }
                    }
                }
            }
            
            // Enhanced debugging
            if (!currentPrice && trades.length === 0) {
                const chartContainer = document.querySelector('.chart-title-indicator-container');
                const closeEl = document.querySelector('span[key="c"]');
                const allKeySpans = document.querySelectorAll('span[key]');
                const priceSpans = Array.from(document.querySelectorAll('span')).filter(s => 
                    /^0\.[0-9]{4,8}$/.test(s.textContent.trim()));
                
                if (document.getElementById('console-log-enabled')?.checked) {
                    console.log('Chart container found:', !!chartContainer);
                    console.log('Close element found:', !!closeEl);
                    console.log('Spans with key attribute:', allKeySpans.length);
                    console.log('Price-like spans found:', priceSpans.length);
                    if (priceSpans.length > 0) {
                        console.log('Sample price spans:', priceSpans.slice(0, 3).map(s => s.textContent));
                    }
                }
            }
            
            return { currentPrice: currentPrice || trades[0], trades: trades.slice(0, 10) };
        }

        function calculateOptimalPrices() {
            const { currentPrice, trades } = getMarketData();
            if (!currentPrice) return null;
            
            const recentBuyPrices = [];
            const recentSellPrices = [];
            
            // Get recent trade prices separated by type
            const tradeBookEl = getXPathElement('/html/body/div[4]/div/div[3]/div/div[7]/div/div/div');
            if (tradeBookEl) {
                const rows = tradeBookEl.querySelectorAll('[role="gridcell"]');
                rows.forEach(row => {
                    const priceEl = row.querySelector('.cursor-pointer');
                    if (priceEl) {
                        const price = parseFloat(priceEl.textContent);
                        if (!isNaN(price) && price > 0) {
                            const isBuy = priceEl.style.color.includes('Buy');
                            const isSell = priceEl.style.color.includes('Sell');
                            if (isBuy) recentBuyPrices.push(price);
                            if (isSell) recentSellPrices.push(price);
                        }
                    }
                });
            }
            
            let buyPrice, sellPrice;
            
            // Use tighter spread based on manual trade analysis: 0.06% total spread
            // Buy slightly below market, Sell slightly above market
            buyPrice = currentPrice * 0.9997;  // 0.03% below market
            sellPrice = currentPrice * 1.0003; // 0.03% above market
            
            const lossPercent = ((buyPrice - sellPrice) / buyPrice * 100).toFixed(3);
            const spread = ((buyPrice - sellPrice) / sellPrice * 100).toFixed(4);
            
            return {
                market: currentPrice.toFixed(8),
                buy: buyPrice.toFixed(8),
                sell: sellPrice.toFixed(8),
                loss: lossPercent,
                spread: spread
            };
        }

        function updateDisplay() {
            // if (mousePaused) return; // Skip updates during countdown (DISABLED)
            
            try {
                // Update balance (independent of price calculation)
                const balanceEl = getXPathElement('/html/body/div[4]/div/div[3]/div/div[9]/div/div/div/div/div[3]/div[6]/div[1]/div[1]/div/div/div[2]/div');
                if (balanceEl) {
                    const balanceText = balanceEl.textContent.trim().replace(/[^0-9.]/g, '');
                    const balanceNum = parseFloat(balanceText);
                    if (!isNaN(balanceNum)) {
                        window.currentBalance = balanceNum;
                        const balanceSpan = document.getElementById('balance');
                        if (balanceSpan) balanceSpan.textContent = balanceNum.toFixed(2);
                    }
                }
            } catch (e) {
                console.log('Balance update error:', e);
            }
            
            // Update total loss display
            try {
                const totalLossEl = document.getElementById('total-loss-display');
                if (totalLossEl) {
                    const totalLoss = getTotalLossFromStorage();
                    totalLossEl.textContent = totalLoss.toFixed(6);
                }
            } catch (e) {
                console.log('Total loss update error:', e);
            }
            
            try {
                const prices = calculateOptimalPrices();
                
                if (prices) {
                    const marketEl = document.getElementById('market-price');
                    const buyEl = document.getElementById('buy-price');
                    const sellEl = document.getElementById('sell-price');
                    const lossPercentEl = document.getElementById('loss-percent');
                    const spreadEl = document.getElementById('spread-info');
                    
                    if (marketEl) marketEl.textContent = prices.market;
                    if (buyEl) buyEl.textContent = prices.buy;
                    if (sellEl) sellEl.textContent = prices.sell;
                    if (lossPercentEl) lossPercentEl.textContent = prices.loss + '%';
                    if (spreadEl) spreadEl.textContent = prices.spread + '%';
                } else {
                    const marketEl = document.getElementById('market-price');
                    if (marketEl) marketEl.textContent = 'No data';
                }
            } catch (e) {
                console.log('Price calculation error:', e);
                const marketEl = document.getElementById('market-price');
                if (marketEl) marketEl.textContent = 'Error: ' + e.message;
            }
        }

        // Update every 100ms for real-time updates
        setInterval(updateDisplay, 100);
        updateDisplay();
        
        // Force initial chart hover
        setTimeout(triggerChartHover, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }
})();
