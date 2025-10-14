// ==UserScript==
// @name         Binance Trading Calculator v2
// @match        *://*.binance.com/*
// @grant        none
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
        
        // Make draggable
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        div.addEventListener('mousedown', (e) => {
            isDragging = true;
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
        let mousePaused = false;
        let mousePauseTimer = null;
        let countdownInterval = null;
        let originalContent = '';
        
        let currentCount = 0;
        
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
        
        // Create single overlay
        const overlay = makeOverlay('trading-overlay', 'Trading Calculator', {top: '12px', left: '12px'});
        
        // Update overlay content structure
        const overlayHTML = `
            <div style="margin-bottom:4px;">Balance: <span id="balance">-</span> USDT</div>
            <div style="margin-bottom:4px;">Market: <span id="market-price">Loading...</span></div>
            <div style="margin-bottom:4px;">Amount: <input id="trade-amount" type="number" value="1" style="width:60px; padding:2px 4px; background:#333; color:white; border:1px solid #555; border-radius:3px;" /> USDT</div>
            <div style="display:flex; align-items:center; gap:4px; margin-bottom:4px;">
                <div style="flex:1;">Buy: <span id="buy-price">-</span></div>
                <button id="fill-buy" style="padding:4px 8px; cursor:pointer; background:#4CAF50; border:none; border-radius:4px; color:white; font-size:12px;">Fill</button>
                <button id="auto-buy" style="padding:4px 8px; cursor:pointer; background:#2E7D32; border:none; border-radius:4px; color:white; font-size:12px;">Buy</button>
            </div>
            <div style="margin-bottom:4px;">Sell: <span id="sell-price">-</span></div>
            <div style="margin-bottom:4px;">Loss: <span id="loss-percent">-</span></div>
            <div style="margin-bottom:4px;">Est. Loss: <span id="loss-usdt">-</span> USDT</div>
            <div style="display:flex; align-items:center; gap:4px; margin-top:8px; padding-top:8px; border-top:1px solid #555;">
                <div style="flex:1;">Trades: <input id="bulk-trades" type="number" value="10" min="1" style="width:50px; padding:2px 4px; background:#333; color:white; border:1px solid #555; border-radius:3px;" /></div>
                <button id="bulk-start" style="padding:4px 12px; cursor:pointer; background:#FF9800; border:none; border-radius:4px; color:white; font-size:12px; font-weight:bold;">Start</button>
            </div>
            <div id="bulk-total-loss" style="margin-top:4px; font-size:12px; color:#FF6B6B;"></div>
            <div id="bulk-status" style="margin-top:4px; font-size:12px; color:#FFD700;"></div>
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
        
        // Ensure checkbox is checked
        function ensureCheckboxChecked() {
            const checkbox = getXPathElement('/html/body/div[4]/div/div[3]/div/div[9]/div/div/div/div/div[3]/div[5]/div[1]/div[1]/div/svg');
            if (checkbox) {
                const isChecked = checkbox.closest('div').querySelector('input[type="checkbox"]')?.checked;
                if (!isChecked) {
                    humanClick(checkbox);
                }
            }
        }
        
        // Add button handlers
        document.getElementById('fill-buy').addEventListener('click', (e) => {
            e.stopPropagation();
            ensureCheckboxChecked();
            
            const buyPrice = document.getElementById('buy-price').textContent;
            const sellPrice = document.getElementById('sell-price').textContent;
            const amount = document.getElementById('trade-amount').value || '1';
            
            const buyPriceInput = document.getElementById('limitPrice');
            const limitTotalInputs = document.querySelectorAll('#limitTotal');
            const amountInput = limitTotalInputs[0];
            const sellPriceInput = limitTotalInputs[1];
            
            if (buyPriceInput && amountInput && sellPriceInput) {
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
                                }, 100);
                            }, 200);
                        }, 100);
                    }, 200);
                }, 100);
                e.target.textContent = '✓';
                setTimeout(() => e.target.textContent = 'Fill', 2000);
            }
        });
        
        // Prevent amount input from triggering drag
        document.getElementById('trade-amount').addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
        
        document.getElementById('bulk-trades').addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
        
        // Get trading fee from Binance UI
        function getTradingFee() {
            const feeEl = getXPathElement('/html/body/div[4]/div/div[3]/div/div[9]/div/div/div/div/div[3]/div[6]/div[2]/div[2]');
            if (feeEl) {
                const feeText = feeEl.textContent.trim().replace(/[^0-9.]/g, '');
                const fee = parseFloat(feeText);
                return !isNaN(fee) ? fee : 0;
            }
            return 0;
        }
        
        // Wait until Open Orders is empty
        async function waitForTradeCompletion() {
            await new Promise(r => setTimeout(r, 5000)); // Wait minimum 5 seconds
            
            const maxWait = 5000; // Additional 5 seconds max
            const start = Date.now();
            
            while (Date.now() - start < maxWait) {
                await new Promise(r => setTimeout(r, 500));
                const orderSection = getXPathElement('/html/body/div[4]/div/div[3]/div/div[8]/div/div/div/div/div[2]/div[1]/div');
                
                if (orderSection && orderSection.textContent.includes('No Ongoing Orders')) {
                    return 'completed';
                }
            }
            
            // Cancel stuck Buy order
            const cancelBtn = getXPathElement('/html/body/div[4]/div/div[3]/div/div[8]/div/div/div/div/div[2]/div[1]/div/div[3]/div/div/div[1]/table/thead/tr/th[9]/div');
            if (cancelBtn) {
                humanClick(cancelBtn);
                await new Promise(r => setTimeout(r, 200));
                await clickCancelConfirmWithRetry();
                return 'cancelled';
            }
            
            return 'timeout';
        }
        
        // Bulk trade execution
        let isExecuting = false;
        async function executeBulkTrades() {
            if (isExecuting) return;
            isExecuting = true;
            
            const tradesCount = parseInt(document.getElementById('bulk-trades').value) || 10;
            const amount = parseFloat(document.getElementById('trade-amount').value) || 1;
            const lossPercent = parseFloat(document.getElementById('loss-percent').textContent) || 0;
            const fee = getTradingFee();
            
            // Calculate total loss: (loss per trade + fee) * number of trades
            const lossPerTrade = (amount * lossPercent / 100) + fee;
            const totalLoss = (lossPerTrade * tradesCount).toFixed(6);
            
            const statusEl = document.getElementById('bulk-status');
            const totalLossEl = document.getElementById('bulk-total-loss');
            const startBtn = document.getElementById('bulk-start');
            
            totalLossEl.textContent = `Est. Total Loss: ${totalLoss} USDT (${tradesCount} trades)`;
            startBtn.disabled = true;
            startBtn.textContent = 'Running...';
            
            for (let i = 0; i < tradesCount; i++) {
                if (!isExecuting) break;
                
                statusEl.textContent = `Trade ${i + 1}/${tradesCount}: Executing...`;
                
                ensureCheckboxChecked();
                
                const buyPrice = document.getElementById('buy-price').textContent;
                const sellPrice = document.getElementById('sell-price').textContent;
                const amount = document.getElementById('trade-amount').value || '1';
                const buyPriceInput = document.getElementById('limitPrice');
                const limitTotalInputs = document.querySelectorAll('#limitTotal');
                const amountInput = limitTotalInputs[0];
                const sellPriceInput = limitTotalInputs[1];
                const buyButton = getXPathElement('/html/body/div[4]/div/div[3]/div/div[9]/div/div/div/div/div[3]/button');
                
                if (buyPriceInput && amountInput && sellPriceInput && buyButton) {
                    buyPriceInput.focus();
                    await new Promise(r => setTimeout(r, 100));
                    setReactValue(buyPriceInput, buyPrice);
                    await new Promise(r => setTimeout(r, 200));
                    amountInput.focus();
                    await new Promise(r => setTimeout(r, 100));
                    setReactValue(amountInput, amount);
                    await new Promise(r => setTimeout(r, 200));
                    sellPriceInput.focus();
                    await new Promise(r => setTimeout(r, 100));
                    setReactValue(sellPriceInput, sellPrice);
                    await new Promise(r => setTimeout(r, 200));
                    
                    simulateMouseMove(buyButton);
                    await new Promise(r => setTimeout(r, randomDelay(30, 50)));
                    humanClick(buyButton);
                    await new Promise(r => setTimeout(r, randomDelay(150, 200)));
                    await clickConfirmWithRetry();
                    
                    // Wait for trade completion
                    statusEl.textContent = `Trade ${i + 1}/${tradesCount}: Waiting...`;
                    const result = await waitForTradeCompletion();
                    statusEl.textContent = `Trade ${i + 1}/${tradesCount}: ${result}`;
                    
                    // Random delay after successful trade (3-10 seconds)
                    if (result === 'completed') {
                        const delay = 3000 + Math.random() * 7000;
                        statusEl.textContent = `Trade ${i + 1}/${tradesCount}: Waiting ${(delay/1000).toFixed(1)}s...`;
                        await new Promise(r => setTimeout(r, delay));
                    } else {
                        await new Promise(r => setTimeout(r, 500));
                    }
                }
            }
            
            statusEl.textContent = `Completed ${tradesCount} trades!`;
            startBtn.disabled = false;
            startBtn.textContent = 'Start';
            isExecuting = false;
            setTimeout(() => statusEl.textContent = '', 3000);
        }
        
        document.getElementById('bulk-start').addEventListener('click', (e) => {
            e.stopPropagation();
            executeBulkTrades();
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
            
            ensureCheckboxChecked();
            
            const buyPrice = document.getElementById('buy-price').textContent;
            const sellPrice = document.getElementById('sell-price').textContent;
            const amount = document.getElementById('trade-amount').value || '1';
            const buyPriceInput = document.getElementById('limitPrice');
            const limitTotalInputs = document.querySelectorAll('#limitTotal');
            const amountInput = limitTotalInputs[0];
            const sellPriceInput = limitTotalInputs[1];
            const buyButton = getXPathElement('/html/body/div[4]/div/div[3]/div/div[9]/div/div/div/div/div[3]/button');
            
            if (buyPriceInput && amountInput && sellPriceInput && buyButton) {
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
                                        simulateMouseMove(buyButton);
                                        setTimeout(() => {
                                            humanClick(buyButton);
                                            setTimeout(async () => {
                                                await clickConfirmWithRetry();
                                                monitorOrder();
                                            }, randomDelay(150, 200));
                                        }, randomDelay(30, 50));
                                    }, randomDelay(50, 80));
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
            
            // Method 1: Try chart close price (most accurate live price)
            const chartCloseEl = document.querySelector('.chart-title-indicator-container .default-label-box[key="c"]');
            if (chartCloseEl) {
                const price = parseFloat(chartCloseEl.textContent);
                if (!isNaN(price) && price > 0) {
                    currentPrice = price;
                    trades.push(price);
                }
            }
            
            // Method 2: Main market price display
            if (!currentPrice) {
                const priceXPath = '/html/body/div[4]/div/div[2]/div/div/div[2]/div[1]';
                const mainPriceEl = getXPathElement(priceXPath);
                if (mainPriceEl) {
                    const priceText = mainPriceEl.textContent.trim().replace(/[$,]/g, '');
                    const price = parseFloat(priceText);
                    if (!isNaN(price) && price > 0) {
                        currentPrice = price;
                        trades.push(price);
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
            
            return { currentPrice: currentPrice || trades[0], trades: trades.slice(0, 10) };
        }

        function calculateOptimalPrices() {
            const { currentPrice, trades } = getMarketData();
            if (!currentPrice) return null;
            
            // Analyze recent trades to find best buy/sell prices
            const recentTrades = trades.slice(0, 20);
            const buyTrades = [];
            const sellTrades = [];
            
            // Get trade book to identify buy/sell orders
            const tradeBookEl = getXPathElement('/html/body/div[4]/div/div[3]/div/div[7]/div/div/div');
            if (tradeBookEl) {
                const rows = tradeBookEl.querySelectorAll('[role="gridcell"]');
                rows.forEach(row => {
                    const priceEl = row.querySelector('[style*="--color-Buy"]');
                    const sellPriceEl = row.querySelector('[style*="--color-Sell"]');
                    
                    if (priceEl) {
                        const p = parseFloat(priceEl.textContent);
                        if (!isNaN(p) && p > 0) buyTrades.push(p);
                    }
                    if (sellPriceEl) {
                        const p = parseFloat(sellPriceEl.textContent);
                        if (!isNaN(p) && p > 0) sellTrades.push(p);
                    }
                });
            }
            
            // Calculate optimal prices based on order book
            let buyPrice, sellPrice;
            
            if (buyTrades.length > 0 && sellTrades.length > 0) {
                const sortedBuy = buyTrades.sort((a,b) => a-b);
                const sortedSell = sellTrades.sort((a,b) => a-b);
                const medianBuy = sortedBuy[Math.floor(sortedBuy.length/2)];
                const medianSell = sortedSell[Math.floor(sortedSell.length/2)];
                
                // Buy at least 0.01% above current to fill instantly
                buyPrice = Math.max(medianBuy, currentPrice * 1.0001);
                
                // Sell at highest possible price from order book that's still below buy
                const viableSells = sortedSell.filter(p => p < buyPrice && p >= currentPrice * 0.999);
                if (viableSells.length > 0) {
                    sellPrice = viableSells[viableSells.length - 1]; // Highest viable sell
                } else {
                    sellPrice = Math.min(medianSell, buyPrice * 0.9995); // 0.05% below buy
                }
            } else {
                buyPrice = currentPrice * 1.0001;
                sellPrice = currentPrice * 0.9999;
            }
            
            const lossPercent = ((buyPrice - sellPrice) / buyPrice * 100).toFixed(3);
            
            return {
                market: currentPrice.toFixed(8),
                buy: buyPrice.toFixed(8),
                sell: sellPrice.toFixed(8),
                loss: lossPercent
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
                        if (balanceSpan) balanceSpan.textContent = balanceNum.toFixed(8);
                    }
                }
            } catch (e) {
                console.log('Balance update error:', e);
            }
            
            try {
                const prices = calculateOptimalPrices();
                
                if (prices) {
                    const marketEl = document.getElementById('market-price');
                    const buyEl = document.getElementById('buy-price');
                    const sellEl = document.getElementById('sell-price');
                    const lossPercentEl = document.getElementById('loss-percent');
                    const lossUsdtEl = document.getElementById('loss-usdt');
                    
                    if (marketEl) marketEl.textContent = prices.market;
                    if (buyEl) buyEl.textContent = prices.buy;
                    if (sellEl) sellEl.textContent = prices.sell;
                    if (lossPercentEl) lossPercentEl.textContent = prices.loss + '%';
                    
                    // Calculate estimated loss in USDT
                    const amountInput = document.getElementById('trade-amount');
                    if (amountInput && lossUsdtEl) {
                        const amount = parseFloat(amountInput.value) || 1;
                        const lossUSDT = (amount * parseFloat(prices.loss) / 100).toFixed(6);
                        lossUsdtEl.textContent = lossUSDT;
                    }
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

        // Update every 10ms for real-time candle data
        setInterval(updateDisplay, 10);
        updateDisplay();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }
})();
