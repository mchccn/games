import chalk from "chalk";
//@ts-ignore
import keypress from "keypress";
import yargs from "yargs";

keypress(process.stdin);

(async () => {
    const opts = yargs
        .help()
        .option("color", {
            alias: "c",
            description: "enables/disables color",
            type: "boolean",
        })
        .option("fps", {
            alias: "f",
            description: "sets fps",
            type: "number",
        })
        .parseSync();

    const { supportsColor } = chalk;

    const centipede = `\
 ██████╗███████╗███╗   ██╗████████╗██╗██████╗ ███████╗██████╗ ███████╗
██╔════╝██╔════╝████╗  ██║╚══██╔══╝██║██╔══██╗██╔════╝██╔══██╗██╔════╝
██║     █████╗  ██╔██╗ ██║   ██║   ██║██████╔╝█████╗  ██║  ██║█████╗  
██║     ██╔══╝  ██║╚██╗██║   ██║   ██║██╔═══╝ ██╔══╝  ██║  ██║██╔══╝  
╚██████╗███████╗██║ ╚████║   ██║   ██║██║     ███████╗██████╔╝███████╗
 ╚═════╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝╚═╝     ╚══════╝╚═════╝ ╚══════╝`;

    console.clear();

    console.log(supportsColor ? chalk.greenBright(centipede) : centipede);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.clear();

    class Segment {
        public static readonly CODE = 3;

        public x: number;
        public y: number;

        public constructor(public parent: Centipede, x: number, y: number) {
            this.x = x;
            this.y = y;
        }

        public clone() {
            return new Segment(this.parent, this.x, this.y);
        }
    }

    class Centipede {
        public segments: Segment[];

        public lastTick = 0;

        public isPoisoned = false;

        public isLooping = false;

        public isGoingUp = false;

        public lastRegen = Date.now();

        public constructor(length: number, public dir: number, public speedBoost = 0) {
            const x = Math.floor(Math.random() * (width - length));

            this.segments = new Array(length).fill(void 0).map((_, i) => new Segment(this, x + i, 0));

            if (dir > 0) this.segments.reverse();
        }

        public get size() {
            return this.segments.length;
        }

        public move() {
            const startLooping = () => {
                this.isGoingUp ? head.y++ : head.y--;

                this.isPoisoned = false;

                this.isLooping = true;

                this.isGoingUp = !this.isGoingUp;
            };

            const move = () => {
                head.x -= this.dir;

                this.dir *= -1;

                this.isGoingUp ? head.y-- : head.y++;

                if (collide(world, [[Segment.CODE]], head)) {
                    if (head.y <= 0 || head.y >= height - 1) {
                        if (!this.isGoingUp) this.isLooping = true;

                        this.isGoingUp ? (head.y += 2) : (head.y -= 2);

                        this.isGoingUp = !this.isGoingUp;
                    } else head.x += this.dir;
                }
            };

            const [head, ...segments] = this.segments;

            let { x, y } = head;

            if (this.isPoisoned) this.isGoingUp ? head.y-- : head.y++;
            else head.x += this.dir;

            if (collide(world, [[Segment.CODE]], head)) this.isPoisoned ? startLooping() : move();

            for (const mushroom of mushrooms) {
                if (mushroom.x === head.x && mushroom.y === head.y) {
                    if (this.isPoisoned) this.isPoisoned = false;

                    if (mushroom.poisoned) this.isPoisoned = true;

                    move();

                    break;
                }
            }

            for (const segment of segments) {
                const temp = { ...segment };

                segment.x = x;
                segment.y = y;

                x = temp.x;
                y = temp.y;
            }

            if (Date.now() - this.lastRegen >= 10000 && this.size < maxLength) {
                this.segments.push(new Segment(this, x, y));

                this.lastRegen = Date.now();
            }

            for (let i = 0; i < this.segments.length; i++) {
                const s = this.segments[i];

                if (player.x === s.x && player.y === s.y) {
                    takeDamage();

                    break;
                }
            }
        }

        public get speed() {
            return maxLength - (this.segments.length - 1) + scale(this.speedBoost, [0, maxBoost], [0, maxBoost + maxLength]);
        }

        public clone() {
            return Centipede.from(this.segments, this.dir);
        }

        public static from(segments: Segment[], dir: number) {
            const c = new Centipede(segments.length, dir);

            segments.forEach((s) => (s.parent = c));

            c.segments = segments.map((s) => s.clone());

            return c;
        }
    }

    class Mushroom {
        public static readonly CODE = 5;
        public static readonly POISONED = 6;

        public static readonly HEALTH = 4;

        public health = Mushroom.HEALTH;

        public poisoned = false;

        public constructor(public x: number, public y: number) {}
    }

    class Flea {
        public static readonly CODE = 8;

        public static readonly HEALTH = 2;

        public health = Flea.HEALTH;

        public x;
        public y = 0;

        public lastTick = 0;

        public constructor() {
            this.x = Math.floor(Math.random() * width);
        }

        public move() {
            this.y++;

            if (this.x === player.x && this.y === player.y) takeDamage();
        }
    }

    class Scorpion {
        public static readonly CODE = 7;

        public x;
        public y;

        public lastTick = 0;

        public constructor(public dir: number) {
            this.x = dir < 0 ? width - 1 : 0;

            const positions = mushrooms.filter(({ poisoned }) => !poisoned).map(({ y }) => y);

            this.y = positions[Math.floor(Math.random() * positions.length)];
        }

        public move() {
            this.x += this.dir;

            if (this.x === player.x && this.y === player.y) takeDamage();

            mushrooms.forEach((m) => {
                if (this.x === m.x && this.y === m.y) {
                    m.poisoned = true;

                    m.health = Mushroom.HEALTH;
                }
            });
        }
    }
    class Spider {
        public static readonly CODE = 4;

        public static readonly TICKS = {
            MOVE: 4,
            STAY: 4,
        };

        public x;
        public y;

        public lastTick = 0;

        public vec: [number, number];

        public ticksLeft = Spider.TICKS.MOVE;

        public stay = 0;

        public constructor(public dir: number) {
            this.x = dir < 0 ? width - 1 : 0;

            this.vec = [dir, 0];

            this.y = Math.floor((Math.random() * width) / 2) + Math.floor(width / 2);
        }

        public move() {
            if (this.ticksLeft > 0) {
                if (this.stay > 0) {
                    this.stay--;
                } else {
                    this.ticksLeft--;

                    const [x, y] = this.vec;

                    this.x += x;
                    this.y += y;
                }
            } else {
                const dx = player.x - this.x;
                const dy = player.y - this.y;

                const d = Math.sqrt(dx * dx + dy * dy);

                const vectors = [
                    [1, 0],
                    [-1, 0],
                    [0, 1],
                    [0, -1],
                    [1, 1],
                    [-1, -1],
                    [1, -1],
                    [-1, 1],
                ] as [number, number][];

                let [x, y] = mostSimilarVector([dx / d, dy / d], vectors) ?? [0, 0];

                const used = [[x, y]];

                while (typeof world[this.x + x * Spider.TICKS.MOVE] === "undefined") {
                    used.push([x, y]);

                    [x, y] = mostSimilarVector(
                        [dx / d, dy / d],
                        vectors.filter(([tx, ty]) => !used.some(([x, y]) => tx === x && ty === y))
                    ) ?? [0, 0];
                }

                this.vec = [x, y];

                this.ticksLeft = Spider.TICKS.MOVE;
                this.stay = Spider.TICKS.STAY;
            }

            if (this.x === player.x && this.y === player.y) takeDamage();
        }
    }

    class Powerup {
        public static readonly CODE = 9;

        public constructor(public x: number, public y: number) {}
    }

    function scale(value: number, [a1, a2]: [number, number], [b1, b2]: [number, number]) {
        return ((value - a1) * (b2 - b1)) / (a2 - a1) + b1;
    }

    function mostSimilarVector([tx, ty]: [number, number], vectors: [number, number][]) {
        const scores = vectors.map(([x, y]) => Math.abs(tx - x) + Math.abs(ty - y));

        const min = Math.min(...scores);

        const potential = scores.flatMap((score, i) => (score === min ? [vectors[i]] : []));

        return potential[Math.floor(Math.random() * potential.length)];
    }

    function collide(arena: number[][], target: (number | undefined)[][], offset = { x: 0, y: 0 }) {
        const m = target;
        const o = offset;

        const d = m.reduce((d, r, i) => (r.every((v) => v === 0) ? i : d), m.length);

        if (o.y + d > arena.length || o.y < 0) return true;

        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0 && arena[y + o.y] && arena[y + o.y][x + o.x] !== 0) {
                    return true;
                }
            }
        }

        return false;
    }

    function createMatrix(w: number, h: number) {
        const matrix = [];

        while (h--) {
            matrix.push(new Array(w).fill(0));
        }

        return matrix;
    }

    function merge(a: number[][], b: (number | undefined)[][], offset = { x: 0, y: 0 }) {
        const o = offset;

        b.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    a[y + o.y][x + o.x] = value;
                }
            });
        });

        return a;
    }

    function drawMatrix(matrix: number[][]) {
        const top = "┌" + "─".repeat(matrix[0].length * 2) + "┐";
        const side = supportsColor ? chalk.bold("│") : "│";
        const bottom = "└" + "─".repeat(matrix[0].length * 2) + "┘";

        return [
            supportsColor ? chalk.bold(top) : top,
            ...matrix.map((row) => side + row.map((value) => (value ? colors[value] : "  ")).join("") + side),
            supportsColor ? chalk.bold(bottom) : bottom,
        ];
    }

    function printScore() {
        if (supportsColor) console.log(chalk.bold(`score:`), chalk.yellow(player.score));
        else console.log(`score:`, player.score.toString());
    }

    function printLives() {
        if (supportsColor) console.log(chalk.bold(`lives:`), chalk.yellow(player.lives));
        else console.log(`lives:`, player.lives.toString());
    }

    function draw() {
        console.clear();

        printScore();

        printLives();

        const output = [...world.map((row) => [...row])];

        player.bullets.forEach((b) => merge(output, [[2]], b));

        mushrooms.forEach((m) => merge(output, [[m.poisoned ? Mushroom.POISONED : Mushroom.CODE]], m));

        powerups.forEach((p) => merge(output, [[Powerup.CODE]], p));

        centipedes
            .map(({ segments }) => segments)
            .flat()
            .forEach((s) => merge(output, [[Segment.CODE]], s));

        fleas.forEach((f) => merge(output, [[Flea.CODE]], f));

        scorpions.forEach((s) => merge(output, [[Scorpion.CODE]], s));

        spiders.forEach((s) => merge(output, [[Spider.CODE]], s));

        merge(output, [[1]], player);

        console.log(drawMatrix(output).join("\n"));
    }

    function powerup() {
        const i = powerups.findIndex(({ x, y }) => x === player.x && y === player.y);

        if (i >= 0) {
            const types = ["LASER", "EXTRA_LIFE", "MACHINE_GUN", "SLOWER_TIME"] as PowerUpType[];

            executePowerup(types[Math.floor(Math.random() * types.length)]);

            powerups.splice(i, 1);
        }
    }

    function executePowerup(p: PowerUpType) {
        switch (p) {
            case "LASER":
                player.hasLaser = true;
            case "EXTRA_LIFE":
                player.lives++;
            case "MACHINE_GUN":
                player.hasMachineGun = true;
                setTimeout(() => (player.hasMachineGun = false), 2500);
            case "SLOWER_TIME":
                player.hasSlowerTime = true;
                setTimeout(() => (player.hasSlowerTime = false), 5000);
        }
    }

    function playerMoveX(dir: number) {
        player.x += dir;

        if (collide(world, [[1]], player)) {
            player.x -= dir;
        }

        powerup();
    }

    function playerMoveY(dir: number) {
        player.y += dir;

        if (collide(world, [[1]], player)) {
            player.y -= dir;
        }

        powerup();
    }

    function playerShoot() {
        if (Date.now() - player.lastShot > (player.hasMachineGun ? 125 : 250)) {
            if (player.hasLaser) {
                const length = height;

                player.bullets.push(
                    ...new Array(length)
                        .fill(void 0)
                        .map((_, i) => ({
                            x: player.x,
                            y: i,
                            lastTick: 0,
                        }))
                        .filter(({ y }) => y <= player.y)
                );

                player.hasLaser = false;
            } else {
                player.bullets.push({
                    x: player.x,
                    y: player.y,
                    lastTick: Date.now(),
                });
            }

            player.lastShot = Date.now();
        }
    }

    function takeDamage() {
        if (player.isInvulnerable) return;

        player.lives--;

        if (player.lives <= 0) {
            console.clear();

            printScore();

            process.exit();
        }

        player.isInvulnerable = true;

        setTimeout(() => (player.isInvulnerable = false), 1000);
    }

    function moveCentipedes() {
        centipedes.forEach((c) => {
            if (Date.now() - c.lastTick >= (1050 - c.speed * 50) * (player.hasSlowerTime ? 2 : 1)) {
                c.move();

                c.lastTick = Date.now();
            }
        });
    }

    function moveFleas() {
        fleas.forEach((f, i) => {
            if (Date.now() - f.lastTick >= (1000 / (f.health <= 1 ? 15 : 7.5)) * (player.hasSlowerTime ? 2 : 1)) {
                f.move();

                if (f.y >= height) fleas.splice(i, 1);

                f.lastTick = Date.now();
            }
        });
    }

    function moveScorpions() {
        scorpions.forEach((s, i) => {
            if (Date.now() - s.lastTick >= (1000 / 7.5) * (player.hasSlowerTime ? 2 : 1)) {
                s.move();

                if (s.x < 0 || s.x >= width) scorpions.splice(i, 1);

                s.lastTick = Date.now();
            }
        });
    }

    function moveSpiders() {
        spiders.forEach((s, i) => {
            if (Date.now() - s.lastTick >= (1000 / 7.5) * (player.hasSlowerTime ? 2 : 1)) {
                s.move();

                if (s.x < 0 || s.x >= width || s.y < 0 || s.y >= height) spiders.splice(i, 1);

                s.lastTick = Date.now();
            }
        });
    }

    function updateBullets() {
        outer: for (let i = 0; i < player.bullets.length; i++) {
            const b = player.bullets[i];

            if (Date.now() - b.lastTick > 1000 / 30) {
                b.y--;

                if (b.y < 0) player.bullets.splice(i, 1);

                for (const c of centipedes) {
                    for (const s of c.segments) {
                        if (b.x === s.x && b.y === s.y) {
                            splitCentipede(c, s);

                            player.bullets.splice(i, 1);

                            continue outer;
                        }
                    }
                }

                mushrooms: for (let j = 0; j < mushrooms.length; j++) {
                    const m = mushrooms[j];

                    if (b.x === m.x && b.y === m.y) {
                        m.health--;

                        if (m.health <= 0) {
                            addScore(m.poisoned ? 5 : 1);

                            mushrooms.splice(j, 1);

                            break mushrooms;
                        }

                        player.bullets.splice(i, 1);

                        break mushrooms;
                    }
                }

                for (let j = 0; j < fleas.length; j++) {
                    const f = fleas[j];

                    if (b.x === f.x && b.y === f.y) {
                        f.health--;

                        if (f.health <= 0) {
                            addScore(200);

                            fleas.splice(j, 1);
                        }

                        player.bullets.splice(i, 1);

                        continue outer;
                    }
                }

                for (let j = 0; j < scorpions.length; j++) {
                    const s = scorpions[j];

                    if (b.x === s.x && b.y === s.y) {
                        scorpions.splice(j, 1);

                        addScore(1000);

                        player.bullets.splice(i, 1);

                        continue outer;
                    }
                }

                for (let j = 0; j < spiders.length; j++) {
                    const s = spiders[j];

                    if (b.x === s.x && b.y === s.y) {
                        spiders.splice(j, 1);

                        const dx = player.x - s.x;
                        const dy = player.y - s.y;

                        const d = Math.sqrt(dx * dx + dy * dy);

                        addScore(Math.max(Math.floor(((height - d) * 33.333) / 300) * 300, 300));

                        player.bullets.splice(i, 1);

                        continue outer;
                    }
                }

                b.lastTick = Date.now();
            }
        }
    }

    function splitCentipede(centipede: Centipede, segment: Segment) {
        const index = centipede.segments.findIndex((s) => s === segment);

        addScore(segment === centipede.segments[0] ? 100 : 10);

        if (segment.y < height && !mushrooms.find(({ x, y }) => x === segment.x && y === segment.y)) mushrooms.push(new Mushroom(segment.x, segment.y));

        const [first, second] = [centipede.segments.slice(0, index), centipede.segments.slice(index + 1)];

        outer: for (let i = 0; i < centipedes.length; i++) {
            for (const s of centipedes[i].segments) {
                if (s.parent === centipede) {
                    centipedes.splice(i, 1);

                    break outer;
                }
            }
        }

        const { speedBoost, isGoingUp, isLooping, isPoisoned, dir, lastRegen, lastTick } = centipede;

        if (first.length)
            centipedes.push(
                Object.assign(Centipede.from(first, centipede.dir), {
                    speedBoost,
                    isGoingUp,
                    isLooping,
                    isPoisoned,
                    dir,
                    lastRegen,
                    lastTick,
                })
            );

        if (second.length)
            centipedes.push(
                Object.assign(Centipede.from(second, centipede.dir), {
                    speedBoost,
                    isGoingUp,
                    isLooping,
                    isPoisoned,
                    dir,
                    lastRegen,
                    lastTick,
                })
            );
    }

    let thresholds = new Array(100).fill(void 0).map((_, i) => (i + 1) * 10000);

    function addScore(score: number) {
        player.score += score;

        if (player.score > thresholds[0]) {
            player.lives++;

            thresholds.shift();

            if (!thresholds.length) win();
        }
    }

    function spawnBabyCentipede() {
        if (Date.now() - lastBabySpawn - Math.floor(Math.random() * 1000) < 10000 * (player.hasSlowerTime ? 2 : 1)) return;

        const y = Math.floor(Math.random() * height);

        const dir = Math.sign(Math.random() - 0.5);

        const c = new Centipede(1, dir, Math.floor(wave / maxLength));

        c.segments = [new Segment(c, dir === -1 ? width - 1 : 0, y)];

        centipedes.push(c);

        lastBabySpawn = Date.now();
    }

    let wave = -1;

    function nextWave() {
        const length = maxLength - (++wave % maxLength);

        addScore(wave * 10);

        if (maxLength - length) centipedes.push(new Centipede(maxLength - length, Math.sign(Math.random() - 0.5), Math.floor(wave / maxLength)));

        if (wave > maxBoost * maxLength) win();

        centipedes.push(new Centipede(length, Math.sign(Math.random() - 0.5), Math.floor(wave / maxLength)));

        lastBabySpawn = 0;
    }

    function win() {
        printScore();

        process.exit();
    }

    let renderCounter = 0;

    let lastFlea = Date.now();
    let lastScorpion = 0;
    let lastSpider = Date.now();

    let lastPowerup = Date.now();

    let lastBabySpawn = 0;

    function update() {
        renderCounter += 1000 / 60;

        updateBullets();

        moveCentipedes();

        moveFleas();

        moveScorpions();

        moveSpiders();

        if (!centipedes.filter(({ size }) => size !== 1).length) nextWave();

        if (centipedes.filter(({ size }) => size !== 1).every(({ isLooping }) => isLooping)) spawnBabyCentipede();

        if (
            mushrooms.filter(({ poisoned }) => !poisoned).length <= 5 &&
            Date.now() - lastFlea - Math.floor(Math.random() * 1000) > 5000 * (player.hasSlowerTime ? 2 : 1)
        ) {
            fleas.push(new Flea());

            lastFlea = Date.now();
        } else if (
            mushrooms.filter(({ poisoned }) => !poisoned).length > 5 &&
            Date.now() - lastScorpion - Math.floor(Math.random() * 1000) > 10000 * (player.hasSlowerTime ? 2 : 1)
        ) {
            scorpions.push(new Scorpion(Math.sign(Math.random() - 0.5)));

            lastScorpion = Date.now();
        }

        if (Date.now() - lastSpider - Math.floor(Math.random() * 1000) > 20000 * (player.hasSlowerTime ? 2 : 1)) {
            spiders.push(new Spider(Math.sign(Math.random() - 0.5)));

            lastSpider = Date.now();
        }

        if (Date.now() - lastPowerup - Math.floor(Math.random() * 1000) > 30000) {
            powerups.push(new Powerup(Math.floor(Math.random() * width), Math.floor((Math.random() * height) / 2) + Math.floor(height / 2)));

            lastPowerup = Date.now();
        }

        if (renderCounter >= 1000 / fps) {
            draw();

            renderCounter = 0;
        }
    }

    process.stdin.on("keypress", (_, key) => {
        if (!key) return;

        if (key.name === "left") playerMoveX(-1);
        else if (key.name === "right") playerMoveX(1);
        else if (key.name === "up") playerMoveY(-1);
        else if (key.name === "down") playerMoveY(1);
        else if (key.name === "space") playerShoot();
        else if (key.name.toLowerCase() === "c" && key.ctrl) process.exit();
    });

    process.stdin.setRawMode(true);
    process.stdin.resume();

    const width = 25;
    const height = 32;

    const colors =
        supportsColor && !opts.color
            ? [
                  " ",
                  chalk.bgCyan(" "),
                  chalk.bgRedBright(" "),
                  chalk.bgGreenBright(" "),
                  chalk.bgMagentaBright(" "),
                  chalk.bgBlue(" "),
                  chalk.bgCyan(" "),
                  chalk.bgYellowBright(" "),
                  chalk.bgGray(" "),
                  chalk.red("?"),
              ].map((c) => c.repeat(2))
            : ["  ", "◢◣", "▕▏", "##", "@@", "&&", "$$", "**", "^^", "??"];

    const world = createMatrix(width, height);

    type PowerUpType = "LASER" | "EXTRA_LIFE" | "MACHINE_GUN" | "SLOWER_TIME";

    const player = {
        hasLaser: false,
        hasMachineGun: false,
        hasSlowerTime: false,
        x: Math.floor(width / 2),
        y: height - 1,
        score: 0,
        bullets: [] as {
            x: number;
            y: number;
            lastTick: number;
        }[],
        lives: 3,
        lastShot: 0,
        isInvulnerable: false,
    };

    const fps = opts.fps ?? 60;

    const maxLength = 12;
    const maxBoost = 8;

    const centipedes = [] as Centipede[];
    const mushrooms = [] as Mushroom[];
    const fleas = [] as Flea[];
    const scorpions = [] as Scorpion[];
    const spiders = [] as Spider[];
    const powerups = [] as Powerup[];

    nextWave();

    update();

    setInterval(update, 1000 / 60);
})();
