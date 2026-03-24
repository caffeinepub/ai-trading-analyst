import os
os.chdir('/home/ubuntu/workspace/src/frontend')

# Fix SMCAnalysisHub
with open('src/components/SMCAnalysisHub.tsx', 'r') as f:
    content = f.read()
content = content.replace(
    '<svg viewBox="0 0 100 70" className="w-full h-10" preserveAspectRatio="none">',
    '<svg viewBox="0 0 100 70" className="w-full h-10" preserveAspectRatio="none" role="img" aria-label="AMD cycle sparkline">'
)
content = content.replace(
    '].map((s, i) => (',
    '].map((s) => ('
)
content = content.replace(
    '<div key={i} className="flex items-center justify-between">',
    '<div key={s.type + s.price} className="flex items-center justify-between">'
)
with open('src/components/SMCAnalysisHub.tsx', 'w') as f:
    f.write(content)
print('Done SMC')

# Fix SignalsDashboard
with open('src/components/SignalsDashboard.tsx', 'r') as f:
    content = f.read()
content = content.replace('{filtered.map((signal, i) => {', '{filtered.map((signal, idx) => {')
content = content.replace('key={i}', 'key={`${signal.tradingPair}-${String(signal.timestamp)}`}')
content = content.replace('SPARKLINE_DATA[i %', 'SPARKLINE_DATA[idx %')
content = content.replace('signals.item.${i + 1}', 'signals.item.${idx + 1}')
content = content.replace('signals.view.button.${i + 1}', 'signals.view.button.${idx + 1}')
content = content.replace('signals.track.button.${i + 1}', 'signals.track.button.${idx + 1}')
with open('src/components/SignalsDashboard.tsx', 'w') as f:
    f.write(content)
print('Done Signals')

# Fix Navigation
with open('src/components/Navigation.tsx', 'r') as f:
    content = f.read()
content = content.replace(
    '<div className="flex items-center gap-2 cursor-pointer" onClick={() => clear()} data-ocid="nav.user.button">',
    '<button type="button" className="flex items-center gap-2 cursor-pointer bg-transparent border-none" onClick={() => clear()} data-ocid="nav.user.button">'
)
# Replace closing </div> that follows ChevronDown
content = content.replace(
    '<ChevronDown className="w-3 h-3 text-muted-foreground" />\n              </div>',
    '<ChevronDown className="w-3 h-3 text-muted-foreground" />\n              </button>'
)
with open('src/components/Navigation.tsx', 'w') as f:
    f.write(content)
print('Done Nav')

# Fix Footer anchors - replace href="#" but not the caffeine link
with open('src/components/Footer.tsx', 'r') as f:
    content = f.read()
content = content.replace('href="#"', 'href="/#"')
with open('src/components/Footer.tsx', 'w') as f:
    f.write(content)
print('Done Footer')

# Fix CandlestickChart
with open('src/components/CandlestickChart.tsx', 'r') as f:
    content = f.read()
# Fix button type
content = content.replace(
    '<button\n              key={tf}',
    '<button\n              type="button"\n              key={tf}'
)
# Fix SVG - add role and title
content = content.replace(
    'aria-label="BTC/USDT candlestick chart"\n      >',
    'role="img" aria-label="BTC/USDT candlestick chart"\n      >\n        <title>BTC/USDT Candlestick Chart</title>'
)
# Fix array index key in candles
content = content.replace('{CANDLE_DATA.map((candle, i) => {', '{CANDLE_DATA.map((candle, candleIdx) => {')
content = content.replace('<g key={i}>', '<g key={candleIdx}>')
with open('src/components/CandlestickChart.tsx', 'w') as f:
    f.write(content)
print('Done Chart')
