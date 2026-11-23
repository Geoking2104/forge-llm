# Bitcoin mining comparison

Open **Bitcoin** in the Forge header or go directly to `/mining`. Compare up to three SHA-256d machines or fleets in EUR. Start from the 234 TH/s S21 Pro, 200 TH/s S21 or 100 TH/s S19j Pro. Change the hardware fields to model a measured operating profile. Power is measured at the wall. Cooling, fixed daily costs and installed cost are entered per unit. Schedule, tariff and pool assumptions apply to all three slots.

## Network inputs

The included snapshot contains block 976959 and an independently timestamped BTC/EUR quote. Refresh fetches the most recent blocks and price quote from mempool.space through a same-origin endpoint. Average block fees are the mean of the returned blocks’ total transaction fees, converted from satoshis. The two timestamps refer to the underlying block and quote. A failed refresh keeps the previous scenario. A manual network edit is labeled in the comparison. Inputs persist in this browser.

Sources: [mempool API](https://mempool.space/docs/api/rest), [S21 Pro](https://support.bitmain.com/hc/en-us/articles/31321354157593), [S21](https://support.bitmain.com/hc/en-us/articles/23794895251609), [S19j Pro](https://support.bitmain.com/hc/en-us/articles/4403541716761).

## Arithmetic and assumptions

- A calendar day has 86,400 seconds. Scheduled hours in both price bands together may be at most 24. Uptime applies within scheduled hours. The model assumes zero power during downtime. Runtime energy includes additional cooling.
- Rated hashrate is multiplied by unit count, scheduled fraction, uptime and accepted share fraction. Alternatively, enter the accepted TH/s **per unit averaged over an entire calendar day**, including downtime. Re-enter this measured average if the operating schedule changes.
- Expected blocks per day ≈ effective hashes per second × 86,400 / (difficulty × 2³²). The subsidy is calculated for the next block height, in integer satoshis. PPS credits the subsidy. FPPS and PPLNS scenarios include mean block fees. The pool fee applies once. Actual pool contracts, payout timing and PPLNS variance can differ.
- Revenue is expected credited BTC times BTC/EUR. Daily operating margin deducts electricity and daily fixed costs. All-inclusive hosting suppresses the separate electricity charge and the break-even tariff metric. A negative break-even rate means the assumed revenue does not cover fixed costs even with free power.
- Payback is total installed cost divided by a positive daily margin. It holds the scenario constant. Taxes, financing, depreciation, future halvings, network changes and resale value are outside this projection.
- The sensitivity view changes BTC/EUR, difficulty and both electricity rates relative to the current inputs. Pool reconciliation compares credited BTC and metered kWh independently. Use period-representative difficulty, fees and operating conditions for this comparison.

## Reproducible check

An S21 Pro running at 3,510 W for 24 hours uses 84.24 kWh. At €0.20/kWh that costs €16.848 per day before additional cooling. At 234 TH/s, difficulty 100 trillion, subsidy 3.125 BTC and zero fees, the expected payout is about 0.0001471 BTC/day. These are synthetic test conditions. The automated tests cover both payout and energy. Actual payout and meter records can be entered in the reconciliation panel.
