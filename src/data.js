// ===== Default fleet library =====
// Charts transcribed from FHE sample lifting plans (Oct 2026). Values in tonnes.
// Chart text format: first line "H:" then columns separated by "|": "len[/label][/falls]".
// Following lines "radius: v v v ..." with "-" for blank cells.
// Geometry values (pivot, tail, carrier) are approximations for drawing; verify against OEM data.

const CHART_SRC = {
ac700_ha: `H: 15.5 | 20.5 | 25.5 | 30.5 | 35.5 | 40.5 | 45.5 | 50.5 | 55.5 | 60
3: - 312 - - - - - - - -
3.5: - 312 - - - - - - - -
4: - 312 300 - - - - - - -
4.5: - 312 300 - - - - - - -
5: - 312 300 230 197 - - - - -
6: - 296 271 218 187 158 - - - -
7: 294 266 243 206 176 146 123 - - -
8: 264 240 220 195 166 135 116 - - -
9: 236 219 200 183 156 125 110 102 - -
10: 212 201 183 172 146 116 104 96 83.5 -
12: 171 172 156 150 128 101 92.5 86 74.5 65
14: - 146 137 131 115 89.5 82.5 76.5 67.5 59
16: - 126 121 115 104 79.5 74 69 61.5 54.5
18: - 93.5 109 102 96 71 66.5 62 56.5 50
20: - - 98 92 88 64 60 56.5 52.5 46.5
22: - - 81 83.5 80.5 58 54.5 51.5 48.5 43
24: - - - 75 74 52.5 49.5 47.5 45 40
26: - - - 68 68 48 45.5 44 42 37.5
28: - - - - 62.5 44.5 41.5 40.5 39 35
30: - - - - 56 41 38.5 37.5 36.5 32.5
32: - - - - 50 38.5 36 35 34 30.5
34: - - - - - 35.5 33.5 32.5 31.5 28.8
36: - - - - - 33.5 31 30 29.8 27
38: - - - - - - 29.4 28.3 28 25.3
40: - - - - - - 27.6 26.5 26.3 23.8
42: - - - - - - 25.9 24.8 24.8 22.5
44: - - - - - - - 23.4 23.4 21.2
46: - - - - - - - 22.1 22.1 20
48: - - - - - - - - 20.9 19
50: - - - - - - - - 19.7 18
52: - - - - - - - - - 17.1`,
stc500_main: `H: 11.5/I,II/12 | 15.44/I/10 | 19.38/I/8 | 19.38/II/8 | 27.25/I/6 | 27.25/II/6 | 35.15/I/4 | 35.15/II/4 | 39/I/4 | 39/II/4 | 43/I,II/3
3: 50 40 32 21.5 - - - - - - -
3.5: 50 40 32 21.5 - - - - - - -
4: 44.6 40 32 21.5 - - - - - - -
4.5: 40 36 31 21.5 21 15 - - - - -
5: 36.2 33.2 29 20 21 15 - - - - -
5.5: 32 30 27.5 19 21 14.5 - - - - -
6: 28 27.5 25.7 18.1 21 13.7 14 9 - - -
6.5: 25.8 25.5 23.9 17.5 19.5 12.8 14 9 - - -
7: 23.5 23.2 21.5 17 18 12.1 14 9 11.5 9 -
7.5: 21.4 21.2 18.6 16.2 16.8 11.5 13.5 8.5 11.5 9 -
8: 19.5 19.3 17 15.6 15.8 11 12.7 8.5 11 9 9
9: 15.3 15 13.7 13.8 14 10 11.7 7.8 10.5 8.5 8.5
10: - 11.7 10.9 12 12 9 10.7 7.1 10 8 8.1
11: - 9.6 9 10.6 9.9 8.2 9.4 6.4 9 7.5 7.8
12: - 8 8 8.7 9 7.5 8.5 5.8 8 7 7
14: - - 5.3 6.4 6.3 6.1 6.6 5 6.3 5.9 6
16: - - 3.5 4.6 4.7 5 5 4.4 5 5 5.2
18: - - - - 3.5 4.1 4 3.8 4 4 4.2
20: - - - - 2.5 3 3.1 3.2 3.2 3.5 3.3
22: - - - - 1.9 2.3 2.2 2.7 2.4 2.8 2.6
24: - - - - 1.3 1.8 1.7 2.4 1.8 2.1 2
26: - - - - - - 1.2 1.9 1.3 1.65 1.5
28: - - - - - - 0.8 1.5 0.9 1.3 1.15
30: - - - - - - 0.5 1 0.6 0.9 0.9
32: - - - - - - - 0.8 - 0.6 0.6
34: - - - - - - - - - 0.4 -`,

stc750_main: `H: 11.8/I,II/12 | 15.95/I/9 | 20.1/I/9 | 20.1/II/9 | 28.4/I/6 | 28.4/II/6 | 36.7/I/5 | 36.7/II/5 | 45/I,II/2
3: 75 54 43 30 - - - - -
3.5: 70 54 43 29 - - - - -
4: 62 51 43 27 30 16 - - -
4.5: 56 48 40.9 25 30 16 - - -
5: 51 45 38 23 30 16 - - -
5.5: 47 42 35.4 21 29 15.5 - - -
6: 41.5 39 33.1 19.5 27.5 15 - - -
6.5: 36 35 31.1 16.5 26 15 16 9.5 -
7: 32 30.5 28.5 15 24.5 14 16 9.5 -
8: 25 24.5 24 13 22 13 15 9 9.5
9: 19 20 20 10 19.5 12 15 9 9.5
10: - 16.5 17 9 16 11 14 9 9
11: - 13.5 14 8 13.6 9.5 13 8.5 9
12: - 11.5 12 7.6 12 8 12 8.2 9
13: - - 9 7.2 10.5 7.5 11 8 9
14: - - 8.5 6.8 9 7 10 7 8.5
15: - - 6.5 6.5 7.5 6.5 9.2 6.5 8.25
16: - - 6 6 6.8 6 7.8 5.1 8
18: - - - - 5 5.5 6 4 6.5
20: - - - - 4 5 4.8 3.8 5.1
22: - - - - 2.9 4 3.8 3.6 4.1
24: - - - - 2.2 3.2 2.9 3.3 3.3
26: - - - - - - 2.2 3 2.6
28: - - - - - - 1.7 2.5 2
30: - - - - - - 1.3 2 1.5
32: - - - - - - - - 1.2`,

stc1000_main: `H: 13.0 | 17.4/a | 17.4/b | 17.4/c | 17.3 | 21.7/a | 21.7/b | 21.7/c | 21.6 | 26.1 | 26.0/a | 26.0/b
3: 100 80 72.5 65 44.5 - - - - - - -
3.5: 80 75 71 60 40 68 68 65 44 - - -
4: 78 73 69.4 54.5 37.1 67 65 62 40 - - -
4.5: 74 70 67.5 50.3 34.7 66 64 57 36.2 52 47.6 60
5: 70 67 63 46.8 32.9 63.5 62 52.2 33.2 50 46.3 58
5.5: 64.7 61 58.4 43.8 31.5 59.5 58 48.2 30.8 47.5 43.5 55.1
6: 60.5 59 54.3 41.3 30.1 56 54 45 28.8 45.5 40.8 53
6.5: 54.5 52 51 39.1 28.7 52.3 50.8 42 27 43.5 38.6 50.4
7: 49 49.5 48 37 27.5 49 48 39.6 25.5 42 36.5 48
7.5: 45.2 43.6 45.3 34 26.6 45.2 45.3 37.5 24.3 40.5 33.5 45.5
8: 42 43.5 43.3 31.3 25.6 43.5 43.1 35.8 23.3 39 30.7 43
9: 36.5 37 38 27.4 23.3 37 37.9 32.3 21.2 34.2 26.8 38
10: - 33 33.8 24.2 21.6 33 33.7 28.5 19.6 30.4 23.8 33.5
12: - 27 27.5 19.8 18.5 27 27.8 23.4 16.8 24.9 19.5 27.5
14: - - - - - 20.9 22.4 19.8 15 20.4 16.5 21.7
16: - - - - - 16.3 17.7 17 12.7 15.9 14.2 17.1
18: - - - - - - - - - 12.6 12.3 13.7
20: - - - - - - - - - 10.1 10.8 11.2`,

ztc1000v_main: `H: 51.0/a/4 | 51.0/b/4 | 51.0/c/4 | 51.0*/4 | 55.2/a/3 | 55.2/b/3 | 55.2*/3 | 59.4/3 | 59.4*/3 | 63.6*/3 | 70.0*/3
11: 13.5 15.5 18 20 - - - - - - -
12: 13 14.5 17 19.5 13 14 15.5 - - - -
14: 11.3 13 15.5 17.5 11.5 13 14.5 11 12 - -
16: 10 11.5 13.8 15.4 10.5 12 13.5 10.5 11.5 9.5 -
18: 9 10.4 12.4 13.6 9.5 11 12.5 9.6 11 9.2 7
20: 8 9.3 11 11.8 8.5 9.8 11.2 9 10.2 9 7
22: 7.2 8.4 10 9.8 7.8 9 10.2 8.2 9.3 8.4 6.8
24: 6.5 7.6 9 8.3 7 8.2 8.5 7.5 8.5 7.8 6.5
26: 6 6.9 7.5 7 6.4 7.6 7.2 6.9 7.5 7.2 6.2
28: 5.5 6.3 6.5 6 5.9 6.9 6.2 6.4 6.3 6.6 5.9
30: 5 5.7 5.7 5 5.4 5.9 5.3 5.9 5.6 6 5.6
32: 4.5 5.2 4.8 4.2 5 5.1 4.5 5.5 4.8 5 5.2
34: 4.2 4.8 4.1 3.5 4.6 4.4 3.8 4.7 4.1 4.4 4.5
36: 4.9 4.1 3.5 2.9 4.2 3.7 3.1 4.1 3.5 3.8 3.9
38: 3.6 3.6 2.9 2.3 3.9 3.2 2.6 3.5 2.9 3.2 3.3
40: 3.3 3.2 2.5 1.9 3.4 2.7 2.1 3 2.4 2.8 2.9
42: 3.1 2.8 2.1 1.5 3 2.3 1.7 2.6 2 2.4 2.5
44: 2.7 2.4 1.7 1.1 2.6 1.9 1.3 2.2 1.6 2 2.1
46: - - - - 2.3 1.6 1 1.9 1.3 1.6 1.7
48: - - - - - - - 1.6 1 1.3 1.4
50: - - - - - - - - - 1 1.1`,

sac2600_main: `H: 62.5/a | 62.5/b | 67.0/a | 67.0/b | 67.0/c | 71.3 | 71.2
12: 32.7 30.6 - - - - -
14: 30.8 29 28.6 27.3 25.7 24.2 23
16: 28.9 27.4 27.3 26.2 24.6 23.4 22.2
18: 27 25.8 26 25 23.6 22.5 21.4
20: 25.9 24.6 24.7 23.7 22.5 21.7 20.7
22: 23.3 22.7 23.4 22.4 21.4 20.8 19.9
24: 20.6 21.4 20.9 20.6 20.3 19.8 19.1
26: 18.6 19.5 18 19.1 19.2 18.5 18.2
28: 16.2 17.1 15.6 16.7 17.7 16.2 16.6
30: 14.2 15.1 13.6 14.6 15.7 14.1 15.3
32: 12.4 13.2 11.8 12.9 13.9 12.3 13.4
34: 10.9 11.7 10.3 11.3 12.3 10.8 12
36: 9.5 10.4 8.9 10 10.9 9.5 10.6
38: 8.3 9.2 7.7 8.8 9.8 8.3 9.4
40: 7.3 8.1 6.7 7.7 8.7 7.2 8.3
42: 6.3 7.2 5.7 6.8 7.7 6.3 7.4
44: 5.4 6.2 4.9 5.9 6.9 5.3 6.4
46: 4.6 5.5 4.1 5.1 6.1 4.6 5.7
48: 3.9 4.8 3.3 4.4 5.3 3.8 5
50: 3.2 4.1 2.6 3.7 4.7 3.1 4.3
52: 2.5 3.4 1.9 3.1 4.1 2.5 3.6
54: 1.9 2.8 1.3 2.5 3.5 1.9 3`,

ltm1250_T: `H: 15.5/* | 15.5 | 20.7 | 25.9 | 31.1 | 36.3 | 41.5 | 46.7 | 51.9 | 57.1 | 62.3 | 67.5 | 72
3: 176 176 - - - - - - - - - - -
3.5: 173 173 135 - - - - - - - - - -
4: 157 157 135 117 - - - - - - - - -
4.5: 144 144 134 117 - - - - - - - - -
5: 136 136 127 116 86 - - - - - - - -
6: 123 123 115 109 86 71 - - - - - - -
7: 112 109 105 100 84 70 55 - - - - - -
8: 100 97 96 92 82 69 55 43 - - - - -
9: 89 86 86 85 79 68 54 42.5 33.5 - - - -
10: 79 77 77 77 74 65 54 40.5 33.5 26.2 - - -
11: 72 69 70 69 69 62 53 38.5 32.5 26.2 20.7 - -
12: 63 63 63 63 62 58 51 37 31.5 26.2 20.7 17 -
14: - - 52 52 51 52 46 33.5 29.2 24.8 20.6 16.9 14
16: - - 45 44 43.5 44.5 42 29.9 26.6 23.3 19.9 16.8 14
18: - - 25.8 37.5 37 38.5 38.5 27.2 24.3 21.6 18.9 16.2 13.9
20: - - - 32.5 32 35 34 25.2 22.1 19.9 17.7 15.6 13.5
22: - - - 28.5 29.4 30.5 29.5 23.7 20 18.4 16.5 14.8 13.1
24: - - - - 27.1 26.6 25.7 22.4 18.4 17 15.4 14 12.4
26: - - - - 24 23.5 22.7 21.1 17.2 15.6 14.4 13.2 11.7
28: - - - - 21.1 21 20.1 20 16 14.4 13.4 12.4 11
30: - - - - - 18.8 17.9 18.8 15 13.3 12.5 11.7 10.4
32: - - - - - 17 17.1 16.9 14 12.5 11.7 11 9.8
34: - - - - - - 16 15.3 13.1 11.7 10.9 10.3 9.2
36: - - - - - - 14.6 13.9 12.6 11 10.2 9.7 8.7
38: - - - - - - 13.4 12.6 12 10.3 9.6 9.1 8.1
40: - - - - - - - 11.5 11.6 9.8 9 8.5 7.7
42: - - - - - - - 10.4 10.8 9.2 8.5 7.9 7.2
44: - - - - - - - 6.3 9.9 8.8 8.1 7.4 6.7
46: - - - - - - - - 9 8.3 7.7 6.9 6.3
48: - - - - - - - - 8.3 7.9 7.4 6.4 5.9
50: - - - - - - - - - 7.5 7 6.1 5.5
52: - - - - - - - - - 6.9 6.6 5.7 5.2
54: - - - - - - - - - 6.3 6 5.3 4.9
56: - - - - - - - - - - 5.5 4.8 4.6
58: - - - - - - - - - - - 4.2 4.3
60: - - - - - - - - - - - 3.8 3.8
62: - - - - - - - - - - - 3.4 3.3
64: - - - - - - - - - - - - 2.9
66: - - - - - - - - - - - - 2.6`,

zat4000v_main: `H: 77.4*/a | 77.4/b | 77.4/c | 82.2* | 84.8* | 87.5* | 90*
18: 19 18 18 - - - -
20: 18 17 17 15 14.5 12 -
22: 18 16.5 16.5 15 14.5 12 11.5
24: 17.5 16 16 15 14.5 12 11.5
26: 16.5 15 15 14.5 14.3 12 11.5
28: 16 14.3 14.2 14.2 14.1 11.8 11.5
30: 15 13.5 13.4 13.4 13.2 11.6 11.3
32: 14 12.8 12.7 12.7 12.5 10.9 11
34: 13.1 12.4 12.1 12.1 11.9 10.4 10.5
36: 12.3 11.8 11.5 11.5 11.3 9.8 9.9
38: 11.6 11.2 10.8 10.8 10.6 9.4 9.6
40: 11 10.7 10.1 10.2 10 8.8 9
42: 10.4 10.2 9.5 9.6 9.3 8.4 8.5
44: 9.8 9.7 9 9.1 8.8 8 8.2
46: 9.1 9.4 8.4 8.8 8.5 7.7 7.8
48: 8.5 8.8 7.9 8.3 7.9 7.3 7.4
50: 8 8.3 7.4 7.9 7.6 7 7
52: 7.5 7.7 7 7.3 7.1 6.6 6.6
54: 7.1 7.3 6.5 7 6.9 6.2 6.3
56: 6.5 6.8 6.2 6.6 6.6 5.4 6
58: 5.9 6.3 5.8 6.2 6 5 5.7
60: 5.5 5.9 5.4 5.6 5.4 4.6 5.3
62: 5.2 5.6 5.1 5.2 5 4.3 4.8
64: 4.7 5.2 4.8 4.8 4.6 4 4.3
66: 4.3 4.7 4.5 4.4 4.2 3.7 3.9
68: 4 4.5 4.2 4.1 3.9 3.4 3.5
70: - - - 3.8 3.6 3.2 3.2
72: - - - - - 3.1 3.1
74: - - - - - 2.6 2.6
76: - - - - - 2.1 2.2
78: - - - - - - 1.8`,

ltm1500_T: `H: 16.1/1) | 16.1/2) | 16.1 | 21.3 | 26.5 | 31.7 | 36.9 | 42.1
3: 500 500 500 - - - - -
3.5: 400 400 400 262 - - - -
4: 325 325 325 262 248 - - -
4.5: 262 262 261 259 239 - - -
5: 261 255 245 243 229 183 - -
6: 231 226 216 214 208 168 145 -
7: 206 202 192 190 190 156 133 116
8: 186 182 173 170 170 145 123 107
9: 170 162 156 153 153 134 114 100
10: 155 145 141 138 138 124 106 94
12: 128 119 117 114 114 107 92 83
14: 107 100 99 97 97 93 80 73
16: - - - 82 82 83 71 63
18: - - - 71 71 71 65 55
20: - - - 56 61 62 58 49.5
22: - - - - 53 54 53 45
24: - - - - 47 47.5 46 40.5
26: - - - - - 42.5 40.5 36.5
28: - - - - - 37.5 36 33.5
30: - - - - - 32.5 32 31
32: - - - - - - 28.3 28.5
34: - - - - - - 25.3 26.6
36: - - - - - - - 24.2
38: - - - - - - - 21.7
40: - - - - - - - 19.4`,

ac500_wihi: `H: 83 | 73 | 65
21: 38.5 - -
22: 38.5 - -
23: 38.5 - -
24: 38.5 - -
25: 38.5 - -
26: 38.5 - -
27: 38.5 - -
28: 38.5 - -
29: 38.5 - -
30: 38.5 - -
32: 38.5 - -
34: 38.5 36.5 -
36: 38.5 36 -
38: 38.5 36 -
40: 36.5 34.5 -
42: 34.5 32.5 -
44: 32.5 31 29.8
46: 31 29.4 28.2
48: 29.4 27.8 26.7
50: 27.9 26.4 25.3
52: 26.5 25.1 24.1
54: 24.8 23.9 22.9
56: 22 22.8 21.9`
};

const DEFAULT_CRANES = [
  { id:'stc500', drawing:'ltm1090', tint:true, dimsImg:'stc500', model:'STC500', make:'SANY', cls:50, type:'Truck crane', axles:4, carrierLen:11.9, carrierH:3.6, width:2.75,
    outrigger:'6.0x7.2', outLong:6.0, outTrans:7.2, pivotX:-1.6, pivotH:2.5, tail:3.5, boomMin:11.5, boomMax:43, sections:5, boomDepth:0.9,
    mass:38, cwt:3.5, hookBlock:0.7, color:'#e8a33a',
    charts:[{ id:'main', name:'Main boom · 3.5 t CWT · 6.0×7.2 m · 360°', kind:'main', config:'MAINBOOM', cwt:3.5, outrigger:'6.0x7.2', src:CHART_SRC.stc500_main,
      source:'Transcribed from 50T EL SWEDEY sheet' }] },
  { id:'stc750', drawing:'k11002', tint:false, dimsImg:'stc750', model:'STC750', make:'SANY', cls:75, type:'Truck crane', axles:4, carrierLen:14.1, carrierH:3.55, width:2.75,
    outrigger:'7.6x6.1', outLong:6.1, outTrans:7.6, pivotX:-1.6, pivotH:2.6, tail:3.9, boomMin:11.8, boomMax:45, sections:5, boomDepth:1.0,
    mass:42, cwt:4.5, hookBlock:0.6, color:'#e8a33a',
    charts:[{ id:'main', name:'Main boom · 4.5 t CWT · 6.1×7.6 m · 360°', kind:'main', config:'MAINBOOM', cwt:4.5, outrigger:'7.6x6.1', src:CHART_SRC.stc750_main,
      source:'Transcribed from 75T UNION GAS sheet' }] },
  { id:'stc1000', drawing:'k11002', tint:false, dimsImg:'stc1000', model:'STC1000', make:'SANY', cls:100, type:'Truck crane', axles:4, carrierLen:14.99, carrierH:3.92, width:2.75,
    outrigger:'8.3x6.6', outLong:6.63, outTrans:8.3, pivotX:-1.7, pivotH:2.8, tail:4.42, boomMin:13, boomMax:60, sections:6, boomDepth:1.1,
    mass:50, cwt:21.5, hookBlock:0.7, color:'#e8c31a',
    charts:[{ id:'main', name:'Main boom · 21.5 t CWT · 8.3×6.6 m · 360° (13–26 m only)', kind:'main', config:'T', cwt:21.5, outrigger:'8.3x6.6', src:CHART_SRC.stc1000_main,
      source:'Transcribed from CARDIFF 100T sheet — partial (to 26 m boom)' }] },
  { id:'ztc1000v', drawing:'k11002', tint:false, dimsImg:'ztc1000v', model:'ZTC1000V', make:'Zoomlion', cls:100, type:'Truck crane', axles:5, carrierLen:15.7, carrierH:3.92, width:2.75,
    outrigger:'8.0x6.9', outLong:6.94, outTrans:8.0, pivotX:-1.6, pivotH:2.9, tail:4.76, boomMin:11.6, boomMax:70, sections:6, boomDepth:1.1,
    mass:55, cwt:23, hookBlock:0.7, color:'#7cb342',
    charts:[{ id:'main', name:'Main boom · 23 t CWT · 8.0 m · over rear & sides (51–70 m only)', kind:'main', config:'MAINBOOM', cwt:23, outrigger:'8.0x6.9', sectors:['rear','side'], src:CHART_SRC.ztc1000v_main,
      source:'Transcribed from 100T EMCC sheet — partial (51–70 m boom)' }] },
  { id:'ac100', drawing:'k11002', tint:false, model:'AC100', make:'Demag', cls:100, type:'All-terrain', axles:4, carrierLen:13.1, carrierH:3.9, width:2.75,
    outrigger:'7.0x7.1', outLong:7.1, outTrans:7.0, pivotX:-1.5, pivotH:2.8, tail:4.2, boomMin:11.1, boomMax:50, sections:6, boomDepth:1.1,
    mass:48, cwt:25, hookBlock:0.7, color:'#f0f0f0', charts:[] },
  { id:'sac2600', drawing:'ltm1300', tint:true, dimsImg:'sac2600', model:'SAC2600', make:'SANY', cls:260, type:'All-terrain', axles:6, carrierLen:16.69, carrierH:4.0, width:3.0,
    outrigger:'8.3x9.4', outLong:9.49, outTrans:8.3, pivotX:-1.2, pivotH:3.0, tail:4.8, boomMin:13.4, boomMax:80, sections:7, boomDepth:1.4,
    mass:72, cwt:67, hookBlock:0.7, color:'#f0b429',
    charts:[{ id:'main', name:'Main boom · 67 t CWT · full outriggers (62.5–71.2 m only)', kind:'main', config:'MAINBOOM', cwt:67, outrigger:'8.3x9.4', src:CHART_SRC.sac2600_main,
      source:'Transcribed from WHITE ARC BURJEEL sheet — partial (62.5–71.2 m boom)' }] },
  { id:'ltm1250', drawing:'ltm1300', tint:true, dimsImg:'ltm1250', model:'LTM1250', make:'Liebherr', cls:250, type:'All-terrain', axles:6, carrierLen:17.41, carrierH:4.0, width:3.0,
    outrigger:'8.5x8.9', outLong:8.84, outTrans:8.5, pivotX:-1.4, pivotH:3.0, tail:4.95, boomMin:15.5, boomMax:72, sections:6, boomDepth:1.5,
    mass:72, cwt:72.5, hookBlock:1.5, color:'#f5c400',
    charts: IMPORTED_CHARTS.ltm1250 },
  { id:'ltm1080', drawing:'ltm1090', tint:true, dimsImg:'ltm1080', model:'LTM1080', make:'Liebherr', cls:80, type:'All-terrain', axles:4, carrierLen:12.9, carrierH:3.95, width:2.75,
    outrigger:'8.2x7.0', outLong:8.17, outTrans:7.0, pivotX:-1.5, pivotH:3.0, tail:4.08, boomMin:10.8, boomMax:48, sections:5, boomDepth:1.0,
    mass:48, cwt:16, hookBlock:0.8, color:'#f5c400', charts: IMPORTED_CHARTS.ltm1080 },
  { id:'ltm1160', drawing:'ltm1300', tint:true, dimsImg:'ltm1160', model:'LTM1160', make:'Liebherr', cls:160, type:'All-terrain', axles:5, carrierLen:15.3, carrierH:4.0, width:3.0,
    outrigger:'8.0x7.5', outLong:7.98, outTrans:7.5, pivotX:-1.5, pivotH:3.0, tail:4.22, boomMin:13, boomMax:62, sections:5, boomDepth:1.3,
    mass:60, cwt:46.5, hookBlock:1.2, color:'#f5c400', charts: IMPORTED_CHARTS.ltm1160 },
  { id:'ltm1200', drawing:'ltm1300', tint:true, dimsImg:'ltm1200', model:'LTM1200', make:'Liebherr', cls:200, type:'All-terrain', axles:5, carrierLen:15.6, carrierH:4.0, width:3.0,
    outrigger:'8.9x8.3', outLong:8.9, outTrans:8.3, pivotX:-1.5, pivotH:3.0, tail:4.85, boomMin:13.2, boomMax:72, sections:6, boomDepth:1.4,
    mass:60, cwt:72, hookBlock:1.5, color:'#f5c400', charts: IMPORTED_CHARTS.ltm1200 },
  { id:'ltm1300', drawing:'ltm1300', tint:true, dimsImg:'ltm1300', model:'LTM1300', make:'Liebherr', cls:300, type:'All-terrain', axles:6, carrierLen:17.45, carrierH:4.0, width:3.0,
    outrigger:'8.9x8.5', outLong:8.93, outTrans:8.53, pivotX:-1.5, pivotH:3.2, tail:5.6, boomMin:14.7, boomMax:78, sections:7, boomDepth:1.6,
    mass:72, cwt:96, hookBlock:2.0, color:'#f5c400', charts: IMPORTED_CHARTS.ltm1300 },
  { id:'zat4000v', drawing:'ltm1450', tint:true, dimsImg:'zat4000v', model:'ZAT4000V', make:'Zoomlion', cls:400, type:'All-terrain', axles:6, carrierLen:17.65, carrierH:4.0, width:3.0,
    outrigger:'9.38x8.6', outLong:9.35, outTrans:8.6, pivotX:-1.6, pivotH:3.2, tail:5.8, boomMin:15, boomMax:90.1, sections:7, boomDepth:1.6,
    mass:84, cwt:100, hookBlock:0.5, color:'#9ccc3c',
    charts:[{ id:'main', name:'Main boom · 100 t CWT · 9.38×8.6 m · 360° (77.4–90 m only)', kind:'main', config:'MAINBOOM', cwt:100, outrigger:'9.38x8.6', src:CHART_SRC.zat4000v_main,
      source:'Transcribed from WAGNER BRIO WATHBA sheet — partial (77.4–90 m boom)' }] },
  { id:'ac500', drawing:'ltm1500', tint:true, dimsImg:'ac500', model:'AC500', make:'Demag', cls:500, type:'All-terrain', axles:8, carrierLen:17.15, carrierH:4.0, width:3.0,
    outrigger:'9.62x9.6', outLong:9.62, outTrans:9.6, pivotX:-0.9, pivotH:2.9, tail:6.1, boomMin:15.7, boomMax:56, sections:6, boomDepth:1.8,
    mass:96, cwt:160, hookBlock:0.75, color:'#eeeeee',
    charts:[{ id:'wihi', name:'WIHI luffing jib · 14.7 m boom + 4.0 m adapter + 60 m jib · 180 t CWT', kind:'luffing', config:'WIHI', cwt:180, outrigger:'9.62x9.6',
      mainLen:18.7, mainLabel:14.7, jibLen:60, src:CHART_SRC.ac500_wihi,
      source:'Transcribed from ZAKIR MARINE KHALIFA PORT sheet (columns = main boom angle °)' }] },
  { id:'ltm1500', drawing:'ltm1500', tint:true, dimsImg:'ltm1500', model:'LTM1500', make:'Liebherr', cls:500, type:'All-terrain', axles:8, carrierLen:20.97, carrierH:4.0, width:3.0,
    outrigger:'9.6x10.0', outLong:9.99, outTrans:9.6, pivotX:-1.5, pivotH:3.2, tail:6.0, boomMin:16.1, boomMax:84, sections:7, boomDepth:1.8,
    mass:96, cwt:135, hookBlock:2.8, color:'#f5c400',
    charts: IMPORTED_CHARTS.ltm1500 },
  { id:'ltm1650', drawing:'ltm1650', tint:true, dimsImg:'ltm1650', model:'LTM1650', make:'Liebherr', cls:650, type:'All-terrain', axles:8, carrierLen:21.49, carrierH:4.0, width:3.0,
    outrigger:'10.5x9.6', outLong:10.53, outTrans:9.6, pivotX:-1.5, pivotH:3.3, tail:6.5, boomMin:16.6, boomMax:80, sections:7, boomDepth:1.9,
    mass:108, cwt:175, hookBlock:1.35, color:'#f5c400', charts:[] },
  { id:'ac700', drawing:'ltm1500', tint:true, model:'AC700', make:'Demag', cls:700, type:'All-terrain', axles:9, carrierLen:19.5, carrierH:4.0, width:3.0,
    outrigger:'12.1x12.3', outLong:12.3, outTrans:12.1, pivotX:-1.0, pivotH:3.2, tail:6.5, boomMin:15.7, boomMax:60, sections:7, boomDepth:2.0,
    mass:108, cwt:160, hookBlock:0.75, color:'#eeeeee',
    charts:[{ id:'ha', name:'Main boom Ha · 360° · VERIFY CW & outriggers', kind:'main', config:'HA', cwt:160, outrigger:'12.4x12.4', src:CHART_SRC.ac700_ha, verify:true,
      source:'Sarens public AC 700 datasheet p.5, auto-transcribed — over-rear-only values removed' }] },
];

// brand bodies, real section counts, accessories and jib ranges (typical — check the crane's own spec)
const CRANE_EXTRAS = {
  stc500:   { drawing:'ztc600v', drawProxy:true, tint:true, acc:['flyjib'], jib:{ fly:[8, 15] }, color:'#e8a33a' },
  stc750:   { drawing:'ztc600v', drawProxy:true, tint:true, acc:['flyjib'], jib:{ fly:[8, 16] } },
  stc1000:  { drawing:'ztc1000v', drawProxy:true, tint:true, acc:['flyjib'], jib:{ fly:[9.5, 17.5] } },
  ztc1000v: { drawing:'ztc1000v', tint:false, acc:['flyjib'], jib:{ fly:[9.5, 17.5] } },
  ac100:    { drawing:'ltm1090', drawProxy:true, tint:true, acc:['flyjib','runner'], jib:{ fly:[8, 22] } },
  sac2600:  { drawing:'zat2000v', drawProxy:true, tint:true, acc:['flyjib','runner'], jib:{ fly:[11, 38] } },
  ltm1250:  { drawing:'ltm1250', tint:true, acc:['flyjib','luffing','runner'] },
  ltm1080:  { drawing:'ltm1090', drawProxy:true, tint:true, acc:['flyjib','runner'] },
  ltm1160:  { drawing:'ltm1160', tint:true, acc:['flyjib','runner'] },
  ltm1200:  { drawing:'ltm1220', drawProxy:true, tint:true, acc:['flyjib','runner'] },
  ltm1300:  { drawing:'ltm1300', tint:true, acc:['flyjib','luffing','runner'], jib:{ luff:[21, 70] } },
  zat4000v: { drawing:'zat2000v', drawProxy:true, tint:true, acc:['flyjib','luffing','superlift'], jib:{ fly:[12, 38], luff:[24, 84] } },
  ac500:    { drawing:'ac700', drawProxy:true, tint:true, acc:['flyjib','luffing','superlift'], jib:{ fly:[6, 36], luff:[24, 84] } },
  ltm1500:  { drawing:'ltm1500', tint:true, acc:['flyjib','luffing','yguy','runner'] },
  ltm1650:  { drawing:'ltm1650', tint:true, acc:['flyjib','luffing','yguy','runner'], jib:{ fly:[12, 56], luff:[21, 91] } },
  ac700:    { drawing:'ac700', tint:true, acc:['flyjib','luffing','superlift','extension'], jib:{ fly:[6, 36], luff:[24, 108] } },
};
for (const c of DEFAULT_CRANES) Object.assign(c, CRANE_EXTRAS[c.id] || {});

// ---------- lifting sectors: which sides of the carrier a load chart is valid for ----------
// chart.sectors = ['360'] (full circle — also the default when a chart says nothing), or any of 'rear' (over the rear) and 'side' (over the left / right
// side), e.g. ['rear','side'] for "over rear & sides". The front is never offered (loads are not lifted over the cab). The engine reads this through
// chartCoversSide(); charts without the field (your own, older saved cranes) get it inferred from their name / source text.
function inferChartSectors(ch) {
  const name = String(ch?.name || '').toLowerCase();
  if (/360\s*°|360\s*deg|full[\s-]*(circle|slew)|all[\s-]*round/.test(name)) return ['360'];
  const look = (t) => { const rear = /\brear\b/.test(t), side = /\bsides?\b/.test(t); return rear && side ? ['rear', 'side'] : rear ? ['rear'] : side ? ['side'] : null; };
  const src = String(ch?.source || '').toLowerCase();
  return look(name) || (/remov|omit|exclud|without/.test(src) ? null : look(src)) || ['360'];
}
function tagChartSectors(chs) { for (const ch of chs || []) if (ch && !(Array.isArray(ch.sectors) && ch.sectors.length)) ch.sectors = inferChartSectors(ch); }
for (const c of DEFAULT_CRANES) tagChartSectors(c.charts);
if (typeof IMPORTED_CHARTS !== 'undefined') for (const k of Object.keys(IMPORTED_CHARTS)) tagChartSectors(IMPORTED_CHARTS[k]);

const DEFAULT_SETTINGS = {
  company:'FRIENDSHIP HALL EST',
  companyLines:['P.O BOX. 8058, ABU DHABI UAE','TEL:02-4485660  FAX:02-4485661','EMAIL: info@fhecranes.com','website:  www.fhecrane.net'],
  logoText:'FHE',
  copyright:'ACCORDING TO THE UAE LAWS, THIS DRAWING IS THE PROPERTY OF FRIENDSHIP HALL SOLE PROPRIETORSHIP DESIGN AS, THE DRAWING CANNOT BE MADE PUBLIC, COPIED OR OTHERWISE USED, WITHOUT THE WRITTEN CONSENT OF FRIENDSHIP HALL SOLE PROPRIETORSHIP',
  notes:[
    'ALL DIMENSIONS ARE IN MILLIMETERS, AND LEVELS ARE IN METER UNLESS NOTED OTHERWISE',
    'READ THESE DRAWINGS IN CONJUNCTION WITH THE MENTIONED RELEVANT INFRASTRUCTURE, ARCHITECTURAL AND STRUCTURAL SHOP DRAWINGS.',
    'NO DIMENSIONS TO BE SCALED OFF, ONLY WRITTEN DIMENSIONS ARE TO BE FOLLOWED.',
    '"TYPICAL" MEANS THE REFERENCED DETAIL SHALL APPLY FOR ALL SIMILAR CONDITIONS UNLESS OTHERWISE NOTED.'
  ],
  utilWarn:75, utilMax:90, minClearance:1.0, lookup:'conservative', outriggerFactor:0.8, tandemDerate:80, pUnit:'t',
  defaultDrawnBy:'HABIB', headerStyle:'yellow'
};
