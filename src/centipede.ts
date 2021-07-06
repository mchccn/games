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

        public isBeingAnnoying = false;

        public annoyingDir = 0;

        public isInUpperHalf = false;

        public constructor(length: number, public dir: number, public speedBoost = 0) {
            const x = Math.floor(Math.random() * (width - length));

            this.segments = new Array(length).fill(void 0).map((_, i) => new Segment(this, x + i, 0));

            if (dir > 0) this.segments.reverse();
        }

        public size() {
            return this.segments.length;
        }

        public move() {
            const annoy = (up: boolean) => {
                head.x += this.annoyingDir * (up ? -1 : 1);

                if (collide(world, [[Segment.CODE]], head)) {
                    head.x -= this.annoyingDir * (up ? -1 : 1);

                    up ? head.y++ : head.y--;

                    this.isInUpperHalf = !up;
                }
            };

            const beAnnoying = () => {
                head.y--;

                this.isPoisoned = false;

                this.isBeingAnnoying = true;

                this.annoyingDir = this.dir;

                if (this.speedBoost > 4) this.speedBoost = 4;

                annoy(false);
            };

            const moveDown = () => {
                head.x -= this.dir;

                this.dir *= -1;

                head.y++;

                if (collide(world, [[Segment.CODE]], head)) beAnnoying();
            };

            const [head, ...segments] = this.segments;

            let { x, y } = head;

            if (this.isBeingAnnoying) {
                annoy(this.isInUpperHalf);
            } else {
                if (this.isPoisoned) head.y++;
                else head.x += this.dir;

                if (collide(world, [[Segment.CODE]], head)) this.isPoisoned ? beAnnoying() : moveDown();

                for (const mushroom of mushrooms) {
                    if (mushroom.x === head.x && mushroom.y === head.y) {
                        if (this.isPoisoned) this.isPoisoned = false;

                        if (mushroom.poisoned) this.isPoisoned = true;

                        moveDown();

                        break;
                    }
                }
            }

            for (const segment of segments) {
                const temp = { ...segment };

                segment.x = x;
                segment.y = y;

                x = temp.x;
                y = temp.y;
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
            return maxLength - (this.segments.length - 1) + this.speedBoost;
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

            this.y = positions[Math.floor(Math.random() * positions.length - 1)];
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

        merge(output, [[1]], player);

        mushrooms.forEach((m) => merge(output, [[m.poisoned ? Mushroom.POISONED : Mushroom.CODE]], m));

        centipedes
            .map(({ segments }) => segments)
            .flat()
            .forEach((s) => merge(output, [[Segment.CODE]], s));

        fleas.forEach((f) => merge(output, [[Flea.CODE]], f));

        scorpions.forEach((s) => merge(output, [[Scorpion.CODE]], s));

        console.log(drawMatrix(output).join("\n"));
    }

    function playerMoveX(dir: number) {
        player.x += dir;

        if (collide(world, [[1]], player)) {
            player.x -= dir;
        }
    }

    function playerMoveY(dir: number) {
        player.y += dir;

        if (collide(world, [[1]], player)) {
            player.y -= dir;
        }
    }

    function playerShoot() {
        if (Date.now() - player.lastShot > 250) {
            const b = player.bullets.find(({ x, y }) => x === player.x && y === player.y);

            if (b) {
                b.stacked++;
            } else {
                player.bullets.push({
                    x: player.x,
                    y: player.y,
                    stacked: 1,
                    lastTick: Date.now(),
                });
            }

            player.lastShot = Date.now();
        }
    }

    function takeDamage() {
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
            if (Date.now() - c.lastTick >= 1000 - c.speed * 50) {
                c.move();

                c.lastTick = Date.now();
            }
        });
    }

    function moveFleas() {
        fleas.forEach((f, i) => {
            if (Date.now() - f.lastTick >= 1000 / (f.health <= 1 ? 15 : 7.5)) {
                f.move();

                if (f.y >= height) fleas.splice(i, 1);

                f.lastTick = Date.now();
            }
        });
    }

    function moveScorpions() {
        scorpions.forEach((s, i) => {
            if (Date.now() - s.lastTick >= 1000 / 7.5) {
                s.move();

                if (s.x < 0 || s.x > width) scorpions.splice(i, 1);

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

                            b.stacked--;

                            if (b.stacked <= 0) {
                                player.bullets.splice(i, 1);

                                continue outer;
                            }

                            break;
                        }
                    }
                }

                for (let i = 0; i < mushrooms.length; i++) {
                    const m = mushrooms[i];

                    if (b.x === m.x && b.y === m.y) {
                        m.health--;

                        if (m.health <= 0) {
                            player.score += m.poisoned ? 5 : 1;

                            mushrooms.splice(i, 1);
                        }

                        b.stacked--;

                        if (b.stacked <= 0) {
                            player.bullets.splice(i, 1);

                            continue outer;
                        }

                        break;
                    }
                }

                for (let i = 0; i < fleas.length; i++) {
                    const f = fleas[i];

                    if (b.x === f.x && b.y === f.y) {
                        f.health--;

                        if (f.health <= 0) {
                            player.score += 200;

                            fleas.splice(i, 1);
                        }

                        b.stacked--;

                        if (b.stacked <= 0) {
                            player.bullets.splice(i, 1);

                            continue outer;
                        }

                        break;
                    }
                }

                for (let i = 0; i < scorpions.length; i++) {
                    const s = scorpions[i];

                    if (b.x === s.x && b.y === s.y) {
                        scorpions.splice(i, 1);

                        player.score += 1000;

                        b.stacked--;

                        if (b.stacked <= 0) {
                            player.bullets.splice(i, 1);

                            continue outer;
                        }

                        break;
                    }
                }

                b.lastTick = Date.now();
            }
        }
    }

    function splitCentipede(centipede: Centipede, segment: Segment) {
        const index = centipede.segments.findIndex((s) => s === segment);

        player.score += segment === centipede.segments[0] ? 100 : 10;

        if (segment.y < height - 2 && !mushrooms.find(({ x, y }) => x === segment.x && y === segment.y)) mushrooms.push(new Mushroom(segment.x, segment.y));

        const [first, second] = [centipede.segments.slice(0, index), centipede.segments.slice(index + 1)];

        outer: for (let i = 0; i < centipedes.length; i++) {
            for (const s of centipedes[i].segments) {
                if (s.parent === centipede) {
                    centipedes.splice(i, 1);

                    break outer;
                }
            }
        }

        if (first.length) centipedes.push(Centipede.from(first, centipede.dir));

        if (second.length) centipedes.push(Centipede.from(second, centipede.dir));
    }

    let renderCounter = 0;

    let lastFlea = Date.now();
    let lastScorpion = 0;

    function update() {
        renderCounter += 1000 / 60;

        updateBullets();

        moveCentipedes();

        moveFleas();

        moveScorpions();

        if (mushrooms.filter(({ poisoned }) => !poisoned).length <= 5 && Date.now() - lastFlea - Math.floor(Math.random() * 1000) > 10000) {
            fleas.push(new Flea());

            lastFlea = Date.now();
        } else if (mushrooms.filter(({ poisoned }) => !poisoned).length > 5 && Date.now() - lastScorpion - Math.floor(Math.random() * 1000) > 15000) {
            scorpions.push(new Scorpion(Math.sign(Math.random() - 0.5)));

            lastScorpion = Date.now();
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
              ].map((c) => c.repeat(2))
            : ["  ", "◢◣", "▕▏", "##", "@@", "&&", "$$", "**", "^^"];

    const world = createMatrix(width, height);

    const player = {
        x: Math.floor(width / 2),
        y: height - 1,
        score: 0,
        bullets: [] as {
            x: number;
            y: number;
            stacked: number;
            lastTick: number;
        }[],
        lives: 3,
        lastShot: 0,
        isInvulnerable: false,
    };

    const fps = opts.fps ?? 60;

    const maxLength = 12;
    const maxBoost = 8;

    const centipedes = [new Centipede(10, 1)] as Centipede[];
    const mushrooms = [] as Mushroom[];
    const fleas = [] as Flea[];
    const scorpions = [] as Scorpion[];

    update();

    setInterval(update, 1000 / 60);
})();
