// lessons.js -- Circuits' lesson cards, from Onyx's user/Apps/circuits/lessons.h (a gate's card shows its symbol and its truth
// table; an idea's card the level's table). [0] English, [1] French.
// MIT License -- Copyright (c) 2026 Stéphane Wegener and the Onyx contributors.
window.CIRCUITS_LESSONS = {
	"wire": {
		"gate": null,
		"title": [
			"Wires",
			"Les fils"
		],
		"text": [
			"A wire carries a signal from an output to an input: 1 (on) or 0 (off). Press on the switch's pin, drag to the lamp's pin and let go. Click the switch: the lamp follows it. When the lamps do what the table says, press Check (F5).",
			"Un fil porte un signal d'une sortie vers une entrée : 1 (allumé) ou 0 (éteint). Appuie sur la borne de l'interrupteur, glisse jusqu'à la borne de la lampe et lâche. Clique l'interrupteur : la lampe le suit. Quand les lampes font ce que dit la table, appuie sur Vérifier (F5)."
		]
	},
	"not": {
		"gate": 2,
		"title": [
			"NOT",
			"NON"
		],
		"text": [
			"NOT turns a signal upside down: 1 becomes 0 and 0 becomes 1. It has one input and one output. Its symbol is a triangle with a small circle at its tip: the circle means \"the opposite\".",
			"NON retourne un signal : 1 devient 0 et 0 devient 1. Elle a une entrée et une sortie. Son symbole est un triangle avec un petit rond à la pointe : le rond veut dire « le contraire »."
		]
	},
	"and": {
		"gate": 3,
		"title": [
			"AND",
			"ET"
		],
		"text": [
			"AND gives 1 only when both its inputs are 1, like a door with two locks: both keys are needed. Its symbol is a D, flat at the back.",
			"ET donne 1 seulement quand ses deux entrées sont à 1, comme une porte à deux serrures : il faut les deux clés. Son symbole est un D, plat à l'arrière."
		]
	},
	"or": {
		"gate": 4,
		"title": [
			"OR",
			"OU"
		],
		"text": [
			"OR gives 1 when at least one of its inputs is 1 -- one, the other, or both. It gives 0 only when both are 0. Its symbol is a curved shield with a pointed front.",
			"OU donne 1 quand au moins une de ses entrées est à 1 : l'une, l'autre ou les deux. Il ne donne 0 que si les deux sont à 0. Son symbole est un bouclier courbe, pointu à l'avant."
		]
	},
	"chain": {
		"gate": null,
		"title": [
			"Chains of gates",
			"Les chaînes de portes"
		],
		"text": [
			"A gate's output can feed another gate. Two AND gates in a row need three inputs at 1: the first one checks A and B, the second checks its result and C. Gates chained so are evaluated one after the other.",
			"La sortie d'une porte peut alimenter une autre porte. Deux portes ET à la suite demandent trois entrées à 1 : la première vérifie A et B, la seconde son résultat et C. Des portes ainsi enchaînées sont calculées l'une après l'autre."
		]
	},
	"nand": {
		"gate": 6,
		"title": [
			"NAND",
			"NON-ET"
		],
		"text": [
			"NOT after AND is so useful that it has its own gate: NAND, \"not and\". It gives 0 only when both inputs are 1. Its symbol is AND's D with NOT's small circle. Here build it from AND and NOT; it is a part of its own from the next level on.",
			"NON après ET sert tant qu'elle a sa propre porte : NON-ET. Elle ne donne 0 que si les deux entrées sont à 1. Son symbole est le D de ET avec le petit rond de NON. Ici, construis-la avec ET et NON ; elle devient une pièce à part dès le niveau suivant."
		]
	},
	"nor": {
		"gate": 7,
		"title": [
			"NOR",
			"NON-OU"
		],
		"text": [
			"NOR is NOT after OR, \"not or\": it gives 1 only when both inputs are 0 -- neither one nor the other. Its symbol is OR's shield with the small circle.",
			"NON-OU est NON après OU : elle ne donne 1 que si les deux entrées sont à 0 -- ni l'une ni l'autre. Son symbole est le bouclier de OU avec le petit rond."
		]
	},
	"universal": {
		"gate": null,
		"title": [
			"NAND does it all",
			"NAND sait tout faire"
		],
		"text": [
			"With NAND alone every other gate can be built. Wire one signal to both inputs of a NAND and it becomes a NOT; put that NOT after a NAND and you have an AND. Chips are made this way: one kind of gate, many times.",
			"Avec NON-ET seule, on peut construire toutes les autres portes. Relie un même signal aux deux entrées d'une NON-ET : elle devient une NON ; mets cette NON après une NON-ET et voilà un ET. Les puces sont faites ainsi : une seule sorte de porte, beaucoup de fois."
		]
	},
	"xor": {
		"gate": 5,
		"title": [
			"XOR",
			"OUX"
		],
		"text": [
			"The light of a hallway with two switches changes whenever either switch is flipped: it is on when exactly one switch is on. That is XOR, \"exclusive or\". Build it here from the gates you know; it is a part of its own from level 2.4 on.",
			"La lumière d'un couloir à deux interrupteurs change dès qu'on bascule l'un d'eux : elle est allumée quand exactement un interrupteur est en marche. C'est OUX, le « OU exclusif ». Construis-le ici avec les portes que tu connais ; il devient une pièce à part dès le niveau 2.4."
		]
	},
	"nandxor": {
		"gate": null,
		"title": [
			"XOR made of NAND",
			"Un OUX en NON-ET"
		],
		"text": [
			"XOR can be built from NAND gates only. One NAND of A and B is shared by two others, one with A, one with B; a last NAND joins them. Four gates in all.",
			"OUX se construit aussi avec des NON-ET seulement. Une NON-ET de A et B est partagée par deux autres, l'une avec A, l'autre avec B ; une dernière NON-ET les réunit. Quatre portes en tout."
		]
	},
	"equal": {
		"gate": null,
		"title": [
			"Same or not",
			"Pareil ou pas"
		],
		"text": [
			"Comparing two bits: the lamp lights when A and B are the same (both 0 or both 1). It is the opposite of XOR, sometimes called XNOR.",
			"Comparer deux bits : la lampe s'allume quand A et B sont pareils (tous deux à 0 ou tous deux à 1). C'est le contraire de OUX, qu'on appelle parfois NON-OUX."
		]
	},
	"majority": {
		"gate": null,
		"title": [
			"Majority vote",
			"Le vote à la majorité"
		],
		"text": [
			"Three voters, two choices: the result is what at least two of them say. A pair that agrees wins: A and B, or C with one of A and B.",
			"Trois votants, deux choix : le résultat est ce que disent au moins deux d'entre eux. Une paire d'accord l'emporte : A et B, ou C avec l'un de A et B."
		]
	},
	"mux": {
		"gate": null,
		"title": [
			"Choosing a signal",
			"Choisir un signal"
		],
		"text": [
			"A multiplexer is a railway switch for signals: S chooses which input goes through -- A when S is 0, B when S is 1. Every computer is full of them.",
			"Un multiplexeur est un aiguillage pour les signaux : S choisit l'entrée qui passe -- A quand S est à 0, B quand S est à 1. Tout ordinateur en est rempli."
		]
	},
	"parity": {
		"gate": null,
		"title": [
			"Parity",
			"La parité"
		],
		"text": [
			"Is the number of 1s odd? XOR answers for two bits; chained, XOR gates answer for as many bits as there are. Parity is how a message checks it was not changed on its way.",
			"Le nombre de 1 est-il impair ? OUX répond pour deux bits ; enchaînées, les portes OUX répondent pour autant de bits qu'on veut. La parité permet à un message de vérifier qu'il n'a pas été changé en route."
		]
	},
	"adder": {
		"gate": null,
		"title": [
			"Adding in binary",
			"Additionner en binaire"
		],
		"text": [
			"In binary, 0 + 1 = 1 and 1 + 1 = 10: a sum bit and a carry. The sum bit is XOR of the two bits, the carry is AND. Two gates: a half adder, the first piece of every calculator.",
			"En binaire, 0 + 1 = 1 et 1 + 1 = 10 : un bit de somme et une retenue. Le bit de somme est le OUX des deux bits, la retenue est leur ET. Deux portes : un demi-additionneur, la première pièce de toute calculatrice."
		]
	},
	"fulladder": {
		"gate": null,
		"title": [
			"The full adder",
			"L'additionneur complet"
		],
		"text": [
			"To add numbers of several bits, each column adds three bits: A, B and the carry in from the column on its right. Two half adders and an OR do it; reuse A XOR B for both outputs.",
			"Pour additionner des nombres de plusieurs bits, chaque colonne additionne trois bits : A, B et la retenue de la colonne à sa droite. Deux demi-additionneurs et un OU le font ; réutilise A OUX B pour les deux sorties."
		]
	},
	"decoder": {
		"gate": null,
		"title": [
			"The decoder",
			"Le décodeur"
		],
		"text": [
			"Two bits make four numbers, 0 to 3. A decoder lights one lamp of four: the one whose number the inputs give. Memories use decoders to pick the cell to read.",
			"Deux bits font quatre nombres, de 0 à 3. Un décodeur allume une lampe sur quatre : celle dont les entrées donnent le numéro. Les mémoires s'en servent pour choisir la case à lire."
		]
	},
	"compare": {
		"gate": null,
		"title": [
			"Comparing numbers",
			"Comparer des nombres"
		],
		"text": [
			"Which is bigger, A or B? Exactly one of three lamps lights: G (greater), E (equal) or L (less). A > B only when A is 1 and B is 0.",
			"Lequel est le plus grand, A ou B ? Une seule des trois lampes s'allume : G (plus grand), E (égal) ou L (plus petit). A > B seulement quand A vaut 1 et B vaut 0."
		]
	}
};
