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
            <div style="margin-bottom:4px;">Loss: <span id="loss-percent">-</span> | Spread: <span id="spread-info">-</span></div>
            <div style="margin-bottom:4px;">Est. Loss: <span id="loss-usdt">-</span> USDT</div>
            <div style="margin-bottom:4px; padding-top:4px; border-top:1px solid #444;">
                Max Loss: <input id="max-loss" type="number" value="10" step="0.1" style="width:50px; padding:2px 4px; background:#333; color:white; border:1px solid #555; border-radius:3px;" /> USDT
            </div>
            <div style="margin-bottom:4px;">
                Max/Hr: <input id="max-trades-hour" type="number" value="30" min="1" style="width:50px; padding:2px 4px; background:#333; color:white; border:1px solid #555; border-radius:3px;" /> trades
            </div>
            <div style="margin-bottom:4px;">
                Delay: <input id="trade-delay" type="number" value="4" min="1" max="10" style="width:50px; padding:2px 4px; background:#333; color:white; border:1px solid #555; border-radius:3px;" /> sec
            </div>
            <div style="display:flex; align-items:center; gap:4px; margin-top:8px; padding-top:8px; border-top:1px solid #555;">
                <div style="flex:1;">Trades: <input id="bulk-trades" type="number" value="10" min="1" style="width:50px; padding:2px 4px; background:#333; color:white; border:1px solid #555; border-radius:3px;" /></div>
                <button id="bulk-start" style="padding:4px 12px; cursor:pointer; background:#FF9800; border:none; border-radius:4px; color:white; font-size:12px; font-weight:bold;">Start</button>
                <button id="bulk-pause" style="padding:4px 12px; cursor:pointer; background:#F44336; border:none; border-radius:4px; color:white; font-size:12px; font-weight:bold; display:none;">Pause</button>
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
        
        // Ensure Reverse Order checkbox is checked
        function ensureCheckboxChecked() {
            const checkboxContainer = getXPathElement('/html/body/div[4]/div/div[3]/div/div[9]/div/div/div/div/div[3]/div[5]/div[1]/div[1]/div');
            if (checkboxContainer) {
                const checkbox = checkboxContainer.querySelector('input[type="checkbox"]');
                if (checkbox && !checkbox.checked) {
                    const svg = checkboxContainer.querySelector('svg');
                    if (svg) {
                        humanClick(svg);
                    }
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
        
        // Prevent inputs from triggering drag
        ['trade-amount', 'bulk-trades', 'bulk-pause', 'max-loss', 'max-trades-hour', 'trade-delay'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('mousedown', (e) => e.stopPropagation());
        });
        
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
        async function waitForTradeCompletion() {
            console.log('Waiting for trade completion...');
            await new Promise(r => setTimeout(r, 2000)); // Wait minimum 2 seconds
            
            // Wait indefinitely until no orders remain
            let checkCount = 0;
            while (true) {
                await new Promise(r => setTimeout(r, 1000)); // Check every 1 second
                checkCount++;
                
                const orderSection = getXPathElement('/html/body/div[4]/div/div[3]/div/div[8]/div/div/div/div/div[2]/div[1]/div');
                
                if (!orderSection) {
                    console.log('Order section not found');
                    continue;
                }
                
                const orderText = orderSection.textContent;
                console.log(`Check ${checkCount}: Order section text:`, orderText);
                
                // Success: No orders at all
                if (orderText.includes('No Ongoing Orders')) {
                    console.log('Trade completed - No Ongoing Orders');
                    return 'completed';
                }
                
                // Cancel stuck Buy order after 10 seconds
                if (checkCount >= 10 && orderText.includes('Buy')) {
                    console.log('Buy order stuck for 10s, canceling...');
                    const cancelBtn = getXPathElement('/html/body/div[4]/div/div[3]/div/div[8]/div/div/div/div/div[2]/div[1]/div/div[3]/div/div/div[1]/table/thead/tr/th[9]/div');
                    if (cancelBtn) {
                        humanClick(cancelBtn);
                        await new Promise(r => setTimeout(r, 200));
                        await clickCancelConfirmWithRetry();
                        return 'cancelled';
                    }
                }
                
                // Continue waiting if Sell order exists (normal flow)
                if (orderText.includes('Sell')) {
                    console.log('Sell order active, waiting...');
                    continue;
                }
            }
        }
        
        // Cookie storage functions
        function saveTradeToStorage(tradeData) {
            const trades = JSON.parse(localStorage.getItem('binanceTrades') || '[]');
            trades.push(tradeData);
            localStorage.setItem('binanceTrades', JSON.stringify(trades));
        }
        
        function getTotalLossFromStorage() {
            const trades = JSON.parse(localStorage.getItem('binanceTrades') || '[]');
            return trades.reduce((sum, t) => sum + parseFloat(t.lossUSDT || 0), 0);
        }
        
        function getTradesInLastHour() {
            const trades = JSON.parse(localStorage.getItem('binanceTrades') || '[]');
            const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
            return trades.filter(t => t.timestamp > oneHourAgo).length;
        }
        
        // Safety checks
        function checkMaxLoss() {
            const maxLoss = parseFloat(document.getElementById('max-loss').value) || 10;
            const totalLoss = getTotalLossFromStorage();
            return totalLoss < maxLoss;
        }
        
        function checkRateLimit() {
            const maxPerHour = parseInt(document.getElementById('max-trades-hour').value) || 30;
            const tradesLastHour = getTradesInLastHour();
            return tradesLastHour < maxPerHour;
        }
        
        function checkBalance(amount) {
            return window.currentBalance >= amount;
        }
        
        // Bulk trade execution
        let isExecuting = false;
        let isPaused = false;
        async function executeBulkTrades() {
            if (isExecuting) return;
            isExecuting = true;
            isPaused = false;
            
            const tradesCount = parseInt(document.getElementById('bulk-trades').value) || 10;
            const statusEl = document.getElementById('bulk-status');
            const totalLossEl = document.getElementById('bulk-total-loss');
            const startBtn = document.getElementById('bulk-start');
            const pauseBtn = document.getElementById('bulk-pause');
            
            startBtn.style.display = 'none';
            pauseBtn.style.display = 'inline-block';
            
            for (let i = 0; i < tradesCount; i++) {
                if (!isExecuting) break;
                
                // Check pause
                while (isPaused && isExecuting) {
                    statusEl.textContent = `Paused at trade ${i + 1}/${tradesCount}`;
                    await new Promise(r => setTimeout(r, 500));
                }
                if (!isExecuting) break;
                
                // Safety checks
                if (!checkMaxLoss()) {
                    statusEl.textContent = 'STOPPED: Max loss limit reached!';
                    statusEl.style.color = '#FF0000';
                    break;
                }
                
                if (!checkRateLimit()) {
                    statusEl.textContent = 'STOPPED: Rate limit reached (wait 1 hour)';
                    statusEl.style.color = '#FF0000';
                    break;
                }
                
                statusEl.textContent = `Trade ${i + 1}/${tradesCount}: Calculating...`;
                statusEl.style.color = '#FFD700';
                
                // Fresh price calculation
                const prices = calculateOptimalPrices();
                if (!prices) {
                    statusEl.textContent = `Trade ${i + 1}/${tradesCount}: Price error`;
                    await new Promise(r => setTimeout(r, 2000));
                    continue;
                }
                
                const amount = parseFloat(document.getElementById('trade-amount').value) || 1;
                
                // Balance check
                if (!checkBalance(amount)) {
                    statusEl.textContent = `STOPPED: Insufficient balance (need ${amount} USDT)`;
                    statusEl.style.color = '#FF0000';
                    break;
                }
                
                const feeUSDT = getTradingFeeUSDT(parseFloat(prices.market));
                const lossUSDT = (amount * parseFloat(prices.loss) / 100 + feeUSDT).toFixed(6);
                const totalLossSoFar = getTotalLossFromStorage();
                
                totalLossEl.textContent = `Total Loss: ${totalLossSoFar.toFixed(6)} USDT | This: ${lossUSDT} USDT`;
                
                ensureCheckboxChecked();
                await new Promise(r => setTimeout(r, 100)); // Wait for checkbox
                
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
                    
                    // Verify sell price was set correctly
                    if (sellPriceInput.value !== prices.sell) {
                        setReactValue(sellPriceInput, prices.sell);
                        await new Promise(r => setTimeout(r, 100));
                    }
                    
                    simulateMouseMove(buyButton);
                    await new Promise(r => setTimeout(r, randomDelay(30, 50)));
                    humanClick(buyButton);
                    await new Promise(r => setTimeout(r, randomDelay(150, 200)));
                    await clickConfirmWithRetry();
                    
                    // Wait for trade completion
                    statusEl.textContent = `Trade ${i + 1}/${tradesCount}: Waiting...`;
                    const result = await waitForTradeCompletion();
                    
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
                    
                    // Save trade data
                    const tradeData = {
                        timestamp: new Date().toISOString(),
                        tradeNumber: i + 1,
                        buyPrice: prices.buy,
                        sellPrice: prices.sell,
                        amount: amount,
                        lossPercent: prices.loss,
                        feeUSDT: feeUSDT.toFixed(6),
                        lossUSDT: lossUSDT,
                        result: result,
                        slippage: slippage.toFixed(3)
                    };
                    saveTradeToStorage(tradeData);
                    
                    // Random delay after successful trade
                    if (result === 'completed') {
                        const maxDelay = parseInt(document.getElementById('trade-delay')?.value) || 4;
                        const delay = 1000 + Math.random() * (maxDelay - 1) * 1000;
                        statusEl.textContent = `Trade ${i + 1}/${tradesCount}: Waiting ${(delay/1000).toFixed(1)}s...`;
                        await new Promise(r => setTimeout(r, delay));
                    } else {
                        await new Promise(r => setTimeout(r, 500));
                    }
                }
            }
            
            const finalLoss = getTotalLossFromStorage();
            statusEl.textContent = `Completed! Total Loss: ${finalLoss.toFixed(6)} USDT`;
            statusEl.style.color = '#4CAF50';
            startBtn.style.display = 'inline-block';
            pauseBtn.style.display = 'none';
            isExecuting = false;
            isPaused = false;
            setTimeout(() => {
                statusEl.textContent = '';
                statusEl.style.color = '#FFD700';
            }, 5000);
        }
        
        document.getElementById('bulk-start').addEventListener('click', (e) => {
            e.stopPropagation();
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
            
            // Method 1: Chart close price (fastest, 50ms acceptable)
            const chartCloseEl = document.querySelector('.default-label-box[key="c"]');
            if (chartCloseEl) {
                const price = parseFloat(chartCloseEl.textContent);
                if (!isNaN(price) && price > 0) {
                    currentPrice = price;
                    trades.push(price);
                }
            }
            
            // Method 2: Top ticker price (alternative live price)
            if (!currentPrice) {
                const tickerPrice = document.querySelector('[class*="showPrice"]');
                if (tickerPrice) {
                    const price = parseFloat(tickerPrice.textContent.replace(/[^0-9.]/g, ''));
                    if (!isNaN(price) && price > 0) {
                        currentPrice = price;
                        trades.push(price);
                    }
                }
            }
            
            // Method 3: Main market price display via XPath
            if (!currentPrice) {
                const priceXPath = '/html/body/div[4]/div/div[2]/div/div/div[2]/div[1]';
                const mainPriceEl = getXPathElement(priceXPath);
                if (mainPriceEl) {
                    const priceText = mainPriceEl.textContent.trim().replace(/[^0-9.]/g, '');
                    const price = parseFloat(priceText);
                    if (!isNaN(price) && price > 0) {
                        currentPrice = price;
                        trades.push(price);
                    }
                }
            }
            
            // Method 4: Any element with large price-like number
            if (!currentPrice) {
                const priceElements = document.querySelectorAll('[class*="price"], [class*="Price"]');
                for (const el of priceElements) {
                    const text = el.textContent.trim().replace(/[^0-9.]/g, '');
                    const price = parseFloat(text);
                    if (!isNaN(price) && price > 0 && text.length > 3) {
                        currentPrice = price;
                        trades.push(price);
                        break;
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
            
            // Log for debugging
            if (!currentPrice && trades.length === 0) {
                console.log('No price found - check selectors');
            }
            
            return { currentPrice: currentPrice || trades[0], trades: trades.slice(0, 10) };
        }

        function calculateOptimalPrices() {
            const { currentPrice, trades } = getMarketData();
            if (!currentPrice) return null;
            
            const recentPrices = [];
            
            // Get recent trade prices
            const tradeBookEl = getXPathElement('/html/body/div[4]/div/div[3]/div/div[7]/div/div/div');
            if (tradeBookEl) {
                const rows = tradeBookEl.querySelectorAll('[role="gridcell"]');
                rows.forEach(row => {
                    const priceEl = row.querySelector('.cursor-pointer');
                    if (priceEl) {
                        const price = parseFloat(priceEl.textContent);
                        if (!isNaN(price) && price > 0) {
                            recentPrices.push(price);
                        }
                    }
                });
            }
            
            let buyPrice, sellPrice;
            
            if (recentPrices.length > 3) {
                // Calculate spread and volatility
                const maxPrice = Math.max(...recentPrices);
                const minPrice = Math.min(...recentPrices);
                const avgPrice = recentPrices.reduce((sum, p) => sum + p, 0) / recentPrices.length;
                const priceRange = maxPrice - minPrice;
                
                // Standard deviation for volatility
                const variance = recentPrices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / recentPrices.length;
                const stdDev = Math.sqrt(variance);
                
                // Spread estimate and volatility buffer
                const spreadEstimate = priceRange / 2;
                const volatilityBuffer = stdDev * 1.5;
                const slippage = Math.max(spreadEstimate, volatilityBuffer);
                
                // Target loss: ~$1.5 per $8000 = 0.01875% ≈ 0.02%
                const targetLossRate = 0.0002; // 0.02% loss rate
                const minGap = currentPrice * targetLossRate * 2; // *2 because gap is split between buy and sell
                
                // Final gap = max(minGap, slippage)
                const finalGap = Math.max(minGap, slippage);
                
                buyPrice = currentPrice + (finalGap / 2);
                sellPrice = currentPrice - (finalGap / 2);
            } else {
                // Fallback: 0.03% offset
                buyPrice = currentPrice * 1.0003;
                sellPrice = currentPrice * 0.9997;
            }
            
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
                    const spreadEl = document.getElementById('spread-info');
                    
                    if (marketEl) marketEl.textContent = prices.market;
                    if (buyEl) buyEl.textContent = prices.buy;
                    if (sellEl) sellEl.textContent = prices.sell;
                    if (lossPercentEl) lossPercentEl.textContent = prices.loss + '%';
                    if (spreadEl) spreadEl.textContent = prices.spread + '%';
                    
                    // Calculate estimated loss in USDT (including fee)
                    const amountInput = document.getElementById('trade-amount');
                    if (amountInput && lossUsdtEl) {
                        const amount = parseFloat(amountInput.value) || 1;
                        const feeUSDT = getTradingFeeUSDT(parseFloat(prices.market));
                        const lossUSDT = (amount * parseFloat(prices.loss) / 100 + feeUSDT).toFixed(6);
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
