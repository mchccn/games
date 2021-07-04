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
        .option("speed", {
            alias: "s",
            description: "sets drop speed",
            type: "number",
        })
        .option("fps", {
            alias: "f",
            description: "sets fps",
            type: "number",
        })
        .option("ascii", {
            alias: "a",
            description: "use ascii chars",
            type: "boolean",
        })
        .parseSync();

    const { supportsColor } = chalk;

    const spaceinvaders = `\
███████╗██████╗  █████╗  ██████╗███████╗    ██╗███╗   ██╗██╗   ██╗ █████╗ ██████╗ ███████╗██████╗ ███████╗
██╔════╝██╔══██╗██╔══██╗██╔════╝██╔════╝    ██║████╗  ██║██║   ██║██╔══██╗██╔══██╗██╔════╝██╔══██╗██╔════╝
███████╗██████╔╝███████║██║     █████╗      ██║██╔██╗ ██║██║   ██║███████║██║  ██║█████╗  ██████╔╝███████╗
╚════██║██╔═══╝ ██╔══██║██║     ██╔══╝      ██║██║╚██╗██║╚██╗ ██╔╝██╔══██║██║  ██║██╔══╝  ██╔══██╗╚════██║
███████║██║     ██║  ██║╚██████╗███████╗    ██║██║ ╚████║ ╚████╔╝ ██║  ██║██████╔╝███████╗██║  ██║███████║
╚══════╝╚═╝     ╚═╝  ╚═╝ ╚═════╝╚══════╝    ╚═╝╚═╝  ╚═══╝  ╚═══╝  ╚═╝  ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝`;

    console.clear();

    console.log(supportsColor ? chalk.blue(spaceinvaders) : spaceinvaders);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.clear();

    function collide(arena: number[][], target: (number | undefined)[][], offset = { x: 0, y: 0 }) {
        const m = target;
        const o = offset;

        const d = m.reduce((d, r, i) => (r.every((v) => v === 0) ? i : d), m.length);

        if (o.y + d > arena.length) return true;

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

        return [supportsColor ? chalk.bold(top) : top, ...matrix.map((row) => side + row.map((value) => (value ? colors[value] : "  ")).join("") + side), supportsColor ? chalk.bold(bottom) : bottom];
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

        const output = [...arena.map((row) => [...row])];

        merge(output, [[1]], player);

        player.bullets.forEach((b) => merge(output, [[2]], b));

        enemies.bullets.forEach((b) => merge(output, [[8]], b));

        merge(output, enemies.entities, enemies);

        console.log(drawMatrix(output).join("\n"));
    }

    function playerMove(dir: number) {
        player.x += dir;

        if (collide(arena, [[1]], player)) {
            player.x -= dir;
        }
    }

    function playerShoot() {
        if (Date.now() - player.lastShot > 250) {
            const b = player.bullets.find(({ x, y }) => x === player.x && y === player.y - 1);

            if (b) {
                b.stacked++;
            } else {
                player.bullets.push({
                    x: player.x,
                    y: player.y - 1,
                    stacked: 1,
                    lastTick: Date.now(),
                });
            }

            player.lastShot = Date.now();
        }
    }

    function enemyMove() {
        enemies.x += enemies.dir;

        if (collide(arena, enemies.entities, enemies)) {
            enemies.x -= enemies.dir;

            enemies.dir *= -1;

            enemies.y++;

            dropInterval -= 10;
        }

        let shots = 1;

        enemyShoot();

        while (Math.random() < 0.25 && shots++ < 5) enemyShoot();
    }

    function enemyShoot() {
        const positions = enemies.entities
            .map((r, y) => r.map((e, x) => ({ e, y: y + enemies.y, x: x + enemies.x })))
            .flat()
            .filter(({ e }) => typeof e !== "undefined");

        const { x, y } = positions[Math.floor(Math.random() * positions.length)];

        enemies.bullets.push({ x, y, lastTick: Date.now() });
    }

    function takeDamage() {
        player.lives--;

        if (player.lives) {
            player.x = Math.floor(width / 2);
            player.y = height - 1;

            nextWave();
        } else {
            console.clear();

            printScore();

            process.exit();
        }
    }

    function update() {
        dropCounter += dropInterval / fps + wave;

        player.bullets.forEach((b, i) => {
            if (Date.now() - b.lastTick > 1000 / 30) {
                b.y--;

                if (b.y < 0) player.bullets.splice(i, 1);

                enemies.entities.forEach((row, y) => {
                    row.forEach((e, x) => {
                        if (!e) return;

                        if (b.y === y + enemies.y && b.x === x + enemies.x) {
                            player.score += (e - 2) * wave * 10;

                            row[x] = undefined;

                            b.stacked--;

                            if (b.stacked <= 0) player.bullets.splice(i, 1);

                            dropCounter += 100;
                        }
                    });
                });

                b.lastTick = Date.now();
            }
        });

        enemies.bullets.forEach((b, i) => {
            if (Date.now() - b.lastTick > 1000 / 10) {
                b.y++;

                if (b.y >= height) enemies.bullets.splice(i, 1);

                if (b.y === player.y && b.x === player.x) {
                    takeDamage();

                    enemies.bullets.splice(i, 1);
                }

                b.lastTick = Date.now();
            }
        });

        enemies.entities.forEach((row, y) => {
            row.forEach((e, x) => {
                if (!e) return;

                if (player.x === x + enemies.x && player.y === y + enemies.y) takeDamage();
            });
        });

        if (enemies.entities.every((row) => row.every((e) => typeof e === "undefined"))) {
            player.score += Math.floor((Math.sqrt(wave) * 100) / 100) * 100;

            nextWave();
        }

        if (dropCounter >= dropInterval - enemies.entities.reduce((total, row) => total + row.reduce((t, e) => (typeof e !== "undefined" ? t! + 1 : t), 0)!, 0) * 5) {
            enemyMove();

            dropCounter = 0;
        }

        draw();
    }

    function nextWave() {
        wave++;

        dropCounter = 0;

        dropInterval -= Math.sqrt(wave) * 10;

        enemies.x = 0;
        enemies.y = 0;
        enemies.dir = 1;

        const rows = wave % 5;

        enemies.entities = new Array(rows).fill(void 0).map((_, i) => new Array(12).fill(void 0).map(() => i + 3));
    }

    process.stdin.on("keypress", (_, key) => {
        if (!key) return;

        if (key.name === "left") playerMove(-1);
        else if (key.name === "right") playerMove(1);
        else if (key.name === "space") playerShoot();
        else if (key.name.toLowerCase() === "c" && key.ctrl) process.exit();
    });

    process.stdin.setRawMode(true);
    process.stdin.resume();

    const colors =
        supportsColor && !opts.color && !opts.ascii
            ? [" ", chalk.bgCyan(" "), chalk.bgRedBright(" "), chalk.bgGreenBright(" "), chalk.bgMagenta(" "), chalk.bgYellowBright(" "), chalk.bgBlue(" "), chalk.bgGray(" "), chalk.bgRed(" ")].map(
                  (c) => c.repeat(2)
              )
            : opts.ascii
            ? ["  ", "◢◣", "██", "$$", "%%", "@@", "&&", "++", "▕▏"]
            : ["  ", "◢◣", "██", "##", "##", "##", "##", "##", "▕▏"];

    const width = 15;
    const height = 16;

    const arena = createMatrix(width, height);

    const player = {
        x: Math.floor(width / 2),
        y: height - 1,
        score: 0,
        bullets: [] as { x: number; y: number; stacked: number; lastTick: number }[],
        lives: 3,
        lastShot: 0,
    };

    let wave = 1;

    let dropCounter = 0;

    let dropInterval = opts.speed ?? 1000;

    const enemies = {
        entities: new Array(wave).fill(void 0).map((_, i) => new Array(12).fill(void 0).map(() => i + 3)) as (number | undefined)[][],
        x: 0,
        y: 0,
        dir: 1,
        bullets: [] as { x: number; y: number; lastTick: number }[],
    };

    const fps = opts.fps ?? 60;

    update();

    setInterval(update, 1000 / fps);
})();
