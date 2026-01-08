# ✅ TASK 4.1 COMPLETE: Interactive Bet Calculator

**Completed:** January 8, 2026  
**Commit:** `feat: interactive bet calculator` (26fd753)

---

## 🎯 What Was Built

### PURPOSE
Help traders **instantly calculate potential profits and losses** before placing bets, making informed decisions with real-time feedback.

### VISUAL DESIGN
**Interactive Calculator with:**
- 💰 **Bet Amount Input** - Dollar input with focus states
- 🟢 **Win Amount** - Large green text showing potential profit
- 🔴 **Loss Amount** - Red text showing maximum loss
- 📊 **ROI Display** - Expected return on investment
- 🎯 **Break-even** - Current odds threshold
- ⚡ **Real-time Updates** - Calculations update as you type
- 🎨 **Smooth Transitions** - Animated value changes

---

## 📦 Component Created

### **BetCalculator Component**
**File:** `apps/web/src/components/BetCalculator.tsx`

**Features:**
- ✅ Interactive bet amount input with $ prefix
- ✅ Real-time win/loss calculations
- ✅ ROI percentage display
- ✅ Break-even odds calculation
- ✅ Quick bet buttons ($50, $100, $250, $500)
- ✅ Risk warning for large bets (>$1000)
- ✅ Three size variants (small, medium, large)
- ✅ Smooth transitions and animations
- ✅ Focus states with emerald ring
- ✅ Hover effects on result cards

**Props:**
```typescript
interface BetCalculatorProps {
  currentOdds: number;      // Current price (0-1, e.g., 0.65)
  outcome?: "YES" | "NO";   // Default: "YES"
  defaultAmount?: number;   // Default: 100
  size?: "small" | "medium" | "large"; // Default: "medium"
  showBreakeven?: boolean;  // Default: true
}
```

**Exports:**
- `BetCalculator` - Full interactive calculator
- `BetCalculatorCompact` - Compact version for cards
- `BetCalculatorInline` - Inline stats display

---

## 🧮 Calculation Logic

### **Win Amount Formula**
```typescript
winAmount = betAmount * (1 / odds - 1)
```

**Example:**
- Bet: $100
- Odds: 0.65 (65¢)
- Win: $100 * (1/0.65 - 1) = $100 * 0.538 = **$53.80**

### **Total Return**
```typescript
totalReturn = betAmount + winAmount
```

**Example:**
- Bet: $100
- Win: $53.80
- Total Return: **$153.80**

### **ROI (Return on Investment)**
```typescript
roi = (winAmount / betAmount) * 100
```

**Example:**
- Win: $53.80
- Bet: $100
- ROI: **53.8%**

### **Max Loss**
```typescript
maxLoss = betAmount
```
Always equal to the bet amount (you lose your entire stake if wrong).

### **Break-even**
```typescript
breakeven = odds * 100
```
The probability at which you break even (in percentage).

---

## 🎨 Visual Layout

### **Full Calculator (Medium/Large Size)**

```
┌─────────────────────────────────────┐
│ Bet Amount                          │
│ [$_____100_____]                    │
│                                     │
│ ┌──────────────┐ ┌──────────────┐  │
│ │ If YES Wins  │ │ If YES Loses │  │
│ │  +$53.80     │ │  -$100.00    │  │
│ │ Total: $153.80│ │ Total: $0.00 │  │
│ └──────────────┘ └──────────────┘  │
│                                     │
│ Expected ROI: +53.8%                │
│ Break-even: 65%                     │
│ Current Odds: 65¢                   │
│                                     │
│ [$50] [$100] [$250] [$500]          │
└─────────────────────────────────────┘
```

### **Color Scheme**
- **Win Card:** 
  - Background: `bg-emerald-500/10`
  - Border: `border-emerald-500/20`
  - Text: `text-emerald-400`
  
- **Loss Card:**
  - Background: `bg-rose-500/10`
  - Border: `border-rose-500/20`
  - Text: `text-rose-400`

- **Input Focus:**
  - Border: `border-emerald-500`
  - Ring: `ring-emerald-500/50`

---

## 📍 Integration Locations

### 1. **OpportunityCard** (Landing Page)
**File:** `apps/web/src/app/page.tsx`

**Location:** After Win Rate History, before CTA button

**Code:**
```tsx
{/* Bet Calculator */}
<div className="px-4 py-4 border-t border-gray-800/50 bg-gray-900/20">
  <BetCalculator 
    currentOdds={yesOdds / 100} 
    outcome="YES" 
    defaultAmount={100}
    size="medium"
  />
</div>
```

**Visual Position:**
1. Market Question
2. Profit Potential
3. Current Odds
4. Volume & Liquidity
5. Candlestick Chart
6. Win Rate History
7. **Bet Calculator** ✅ ← NEW!
8. Smart Money & Risk
9. CTA Button

---

### 2. **Market Detail Page**
**File:** `apps/web/src/app/markets/[id]/page.tsx`

**Location:** Right after key metrics, before "Who's in this market"

**Code:**
```tsx
{/* 2. BET CALCULATOR - Interactive profit/loss calculator */}
<div className="mb-8">
  <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
    <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
      Calculate Your Bet
    </h2>
    <BetCalculator 
      currentOdds={market.currentPrice || 0.5}
      outcome="YES"
      defaultAmount={100}
      size="large"
      showBreakeven={true}
    />
  </div>
</div>
```

**Visual Position:**
1. Header (Market Title, Price, Volume, Spread, Liquidity)
2. **Bet Calculator** ✅ ← NEW!
3. Who's in this Market
4. Hidden Exposure Warning
5. Market Signals
6. Price History
7. (rest of page)

---

## 🎯 User Experience

### **What Traders See**

**Default State (Medium Size):**
```
Bet Amount
$ [100]

┌─────────────┐ ┌─────────────┐
│ If YES Wins │ │ If YES Loses│
│   +$53.80   │ │  -$100.00   │
│ Total: $153.80│ │ Total: $0.00│
└─────────────┘ └─────────────┘

Expected ROI: +53.8%
Break-even: 65%    Current Odds: 65¢

[$50] [$100] [$250] [$500]
```

**As User Types:**
- Values update in real-time
- Smooth transitions on all numbers
- Green/red colors reinforce win/loss
- No page refresh needed

**Quick Bet Buttons:**
- Click $50, $100, $250, or $500
- Instantly populates input
- Active button highlighted in emerald

**Risk Warning (>$1000):**
```
⚠️ Large bet amount. Consider position sizing 
   and risk management.
```

---

## 💡 Why This Matters

### **For Traders:**
- ✅ **Instant Clarity** - See exact profit/loss before betting
- ✅ **Risk Awareness** - Red loss amount makes risk explicit
- ✅ **ROI Comparison** - Compare opportunities by ROI
- ✅ **Quick Sizing** - Fast bet amount selection
- ✅ **No Surprises** - Know exactly what to expect

### **Trading Decisions:**
- **High ROI (>50%)** → Better value opportunity
- **Low ROI (<20%)** → May not be worth the risk
- **Large loss amount** → Consider position sizing
- **Break-even vs odds** → Understand probability needed

---

## 🎨 Styling Details

### **Input Field**
```css
Default: border-gray-700
Focused: border-emerald-500 + ring-emerald-500/50
Font: font-semibold
Background: bg-gray-800
```

### **Win Card (Green)**
```css
Background: bg-emerald-500/10
Border: border-emerald-500/20
Hover: bg-emerald-500/15
Text: text-emerald-400
Value: text-2xl (medium), text-3xl (large)
```

### **Loss Card (Red)**
```css
Background: bg-rose-500/10
Border: border-rose-500/20
Hover: bg-rose-500/15
Text: text-rose-400
Value: text-2xl (medium), text-3xl (large)
```

### **Quick Bet Buttons**
```css
Active: bg-emerald-500 text-gray-950
Inactive: bg-gray-800 text-gray-400
Hover: bg-gray-700 text-gray-300
```

### **Transitions**
```css
All values: transition-all
Colors: transition-colors
Input: transition-all
Cards: transition-all hover:bg-*-15
```

---

## 📊 Size Variants

### **Small**
- Input: `text-sm`
- Values: `text-lg`
- Labels: `text-[10px]`
- No quick bet buttons
- No break-even display
- Compact for cards

### **Medium** (Default)
- Input: `text-base`
- Values: `text-2xl`
- Labels: `text-xs`
- Quick bet buttons included
- Break-even display optional
- Used in OpportunityCard

### **Large**
- Input: `text-lg`
- Values: `text-3xl`
- Labels: `text-sm`
- Quick bet buttons included
- Break-even display included
- Used in market detail page

---

## 🔧 Technical Implementation

### **Component Structure**
```
BetCalculator
├── State: betAmount (string)
├── State: isFocused (boolean)
├── Calculations (derived)
│   ├── winAmount
│   ├── totalReturn
│   ├── roi
│   ├── maxLoss
│   └── breakeven
├── Input Section
│   └── Dollar input with focus states
├── Results Grid
│   ├── Win Card (green)
│   └── Loss Card (red)
├── Stats Row
│   ├── Expected ROI
│   ├── Break-even (optional)
│   └── Current Odds
├── Quick Bet Buttons (optional)
└── Risk Warning (conditional)
```

### **Real-time Updates**
```typescript
const [betAmount, setBetAmount] = useState<string>("100");

// Parse and calculate on every render
const amount = parseFloat(betAmount) || 0;
const winAmount = calculateWinAmount(amount, currentOdds);
const roi = calculateROI(amount, currentOdds);

// No debouncing needed - calculations are instant
```

### **Focus Management**
```typescript
const [isFocused, setIsFocused] = useState(false);

<input
  onFocus={() => setIsFocused(true)}
  onBlur={() => setIsFocused(false)}
  className={`border ${
    isFocused ? "border-emerald-500" : "border-gray-700"
  }`}
/>
```

---

## 🧪 Example Calculations

### **Example 1: Favorable Odds**
```
Bet: $100
Odds: 0.35 (35¢)
Win: $100 * (1/0.35 - 1) = $185.71
ROI: 185.7%
Loss: -$100
```

### **Example 2: Even Odds**
```
Bet: $100
Odds: 0.50 (50¢)
Win: $100 * (1/0.50 - 1) = $100
ROI: 100%
Loss: -$100
```

### **Example 3: Unfavorable Odds**
```
Bet: $100
Odds: 0.85 (85¢)
Win: $100 * (1/0.85 - 1) = $17.65
ROI: 17.6%
Loss: -$100
```

### **Example 4: Large Bet**
```
Bet: $1,500
Odds: 0.65 (65¢)
Win: $1,500 * (1/0.65 - 1) = $807.69
ROI: 53.8%
Loss: -$1,500
⚠️ Risk warning displayed
```

---

## 🎯 User Interactions

### **1. Type Bet Amount**
- Click input field
- Border turns emerald
- Type any amount
- Values update instantly
- Smooth number transitions

### **2. Use Quick Bet Buttons**
- Click $50, $100, $250, or $500
- Input populates immediately
- Active button highlights
- All calculations update

### **3. Review Results**
- Green card shows potential win
- Red card shows potential loss
- ROI helps compare opportunities
- Break-even shows probability needed

### **4. Hover Cards**
- Win card: `hover:bg-emerald-500/15`
- Loss card: `hover:bg-rose-500/15`
- Subtle feedback on interaction

---

## 🚀 Status

### ✅ **Completed:**
- [x] BetCalculator component created
- [x] Win/loss/ROI calculations implemented
- [x] Real-time updates working
- [x] Smooth transitions added
- [x] Three size variants
- [x] Quick bet buttons
- [x] Risk warning for large bets
- [x] Integrated into OpportunityCard
- [x] Added to market detail page
- [x] Focus states and hover effects
- [x] Git committed

### 📝 **Commit:**
`feat: interactive bet calculator` (26fd753)

### 📄 **Files Changed:**
- Created: `apps/web/src/components/BetCalculator.tsx`
- Modified: `apps/web/src/app/page.tsx`
- Modified: `apps/web/src/app/markets/[id]/page.tsx`

---

## 🔄 Future Enhancements

### Phase 1 (Current)
- ✅ Basic win/loss calculations
- ✅ ROI display
- ✅ Quick bet buttons
- ✅ Real-time updates

### Phase 2 (Planned)
- [ ] YES/NO toggle (bet on either outcome)
- [ ] Multiple bet scenarios side-by-side
- [ ] Profit chart visualization
- [ ] Expected value calculation
- [ ] Kelly criterion suggestion

### Phase 3 (Advanced)
- [ ] Portfolio impact analysis
- [ ] Risk/reward ratio
- [ ] Historical ROI for similar bets
- [ ] Bankroll management suggestions
- [ ] Save bet scenarios

---

## 💬 User Feedback Scenarios

### **Scenario 1: New Trader**
> "I want to bet $50 but don't know what I'll win"

**Solution:** Type $50, instantly see +$27.50 win in green

### **Scenario 2: Risk Assessment**
> "Is this bet worth the risk?"

**Solution:** Compare ROI (53.8%) vs risk ($100 loss in red)

### **Scenario 3: Position Sizing**
> "How much should I bet?"

**Solution:** Try quick bet buttons, see different outcomes

### **Scenario 4: Large Bet**
> "I'm betting $2000"

**Solution:** Risk warning appears, encourages consideration

---

## 📊 Component Variants

### **BetCalculator** (Full Version)
```tsx
<BetCalculator 
  currentOdds={0.65}
  outcome="YES"
  defaultAmount={100}
  size="large"
  showBreakeven={true}
/>
```

### **BetCalculatorCompact** (Cards)
```tsx
<BetCalculatorCompact 
  currentOdds={0.65}
  outcome="YES"
/>
```

### **BetCalculatorInline** (Quick Stats)
```tsx
<BetCalculatorInline 
  betAmount={100}
  currentOdds={0.65}
  outcome="YES"
/>
```
Displays: `Win: +$53.80 | Loss: -$100.00 | ROI: 53.8%`

---

## 🎨 Accessibility

### **Keyboard Navigation**
- Tab to input field
- Arrow keys to adjust amount
- Tab to quick bet buttons
- Enter to select button

### **Screen Readers**
- Label: "Bet Amount"
- Input: "Dollar amount input"
- Results: "If YES wins, plus $53.80"
- Warning: "Large bet amount warning"

### **Focus Indicators**
- Clear emerald ring on focus
- High contrast borders
- Visible active states

---

## 🧮 Calculation Accuracy

### **Precision**
- All calculations use JavaScript `Number` type
- Results displayed to 2 decimal places
- ROI displayed to 1 decimal place
- Break-even displayed to 0 decimal places

### **Edge Cases**
- **Zero bet:** All values show $0.00
- **Invalid input:** Treats as 0
- **Odds = 0:** Returns 0 (prevents division by zero)
- **Odds = 1:** Returns 0 (no profit possible)
- **Negative bet:** Treated as 0

---

## 🎉 Summary

**TASK 4.1 is COMPLETE!**

We've successfully implemented an **Interactive Bet Calculator** that:
- ✅ Shows real-time profit/loss calculations
- ✅ Displays win amounts in large green text
- ✅ Shows loss amounts in red text
- ✅ Calculates ROI and break-even
- ✅ Updates instantly as user types
- ✅ Includes quick bet buttons
- ✅ Warns about large bets
- ✅ Has smooth transitions
- ✅ Works in OpportunityCards
- ✅ Works on market detail pages
- ✅ Supports three size variants

**This feature empowers traders to make informed decisions by seeing exact profit/loss scenarios before placing bets.**

---

**Commit:** `feat: interactive bet calculator` (26fd753)  
**Files:** 3 files changed, 287 insertions  
**Status:** ✅ READY FOR PRODUCTION

