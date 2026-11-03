(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.documentElement;

    /* ---------- 見出しを1文字ずつ分割 ---------- */
    const nameEl = document.getElementById('introName');
    if (nameEl) {
        const text = nameEl.textContent;
        nameEl.textContent = '';
        [...text].forEach((c, i) => {
            const s = document.createElement('span');
            s.className = 'ch';
            s.style.setProperty('--i', i);
            s.textContent = c === ' ' ? ' ' : c;
            nameEl.appendChild(s);
        });
        nameEl.setAttribute('aria-label', text);
    }

    /* ---------- タイピング ---------- */
    /*
    const typedEl = document.getElementById('typed');
    const words = ['Webサイトの制作。', 'システムの設計と開発。'];
    if (typedEl) {
        if (reduce) {
            typedEl.textContent = words[0];
        } else {
            let w = 0, i = 0, del = false;
            const tick = () => {
                const full = words[w];
                typedEl.textContent = full.slice(0, i);
                let wait = del ? 28 : 70;
                if (!del && i === full.length) { del = true; wait = 1700; }
                else if (del && i === 0) { del = false; w = (w + 1) % words.length; wait = 400; }
                else i += del ? -1 : 1;
                setTimeout(tick, wait);
            };
            setTimeout(tick, 1400);
        }
    }
    */

    /* ---------- ナビ ---------- */
    const nav = document.getElementById('nav');
    const onScroll = () => nav.classList.toggle('scrolled', scrollY > 40);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* ---------- リビール ---------- */
    const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (e.isIntersecting) {
                e.target.classList.add('in');
                if (e.target.querySelector('.num')) countUp(e.target);
                io.unobserve(e.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('.reveal').forEach((el, i) => {
        el.style.transitionDelay = (el.closest('.cards3, .grid2, .works') ? (i % 3) * 90 : 0) + 'ms';
        io.observe(el);
    });

    /* ---------- カウントアップ ---------- */
    function countUp(scope) {
        scope.querySelectorAll('.num').forEach((el) => {
            if (el.dataset.done) return;
            el.dataset.done = '1';
            const to = parseFloat(el.dataset.count);
            const dec = parseInt(el.dataset.dec || '0', 10);
            const pre = el.dataset.prefix || '';
            const suf = el.dataset.suffix || '';
            const t0 = performance.now();
            const dur = reduce ? 1 : 1400;
            const step = (t) => {
                const p = Math.min((t - t0) / dur, 1);
                const v = to * (1 - Math.pow(1 - p, 3));
                el.textContent = pre + v.toFixed(dec) + suf;
                if (p < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        });
    }

    /* ---------- カードのスポットライト ---------- */
    document.querySelectorAll('.card').forEach((c) => {
        c.addEventListener('pointermove', (e) => {
            const r = c.getBoundingClientRect();
            c.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
            c.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
        });
    });

    /* ---------- 制作物のライブプレビュー ---------- */
    const views = document.querySelectorAll('.work__view');
    const fit = (v) => {
        const f = v.querySelector('iframe');
        if (f) f.style.transform = 'scale(' + (v.clientWidth / 1280) + ')';
    };
    const ro = new ResizeObserver((es) => es.forEach((e) => fit(e.target)));
    const loader = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (!e.isIntersecting) return;
            const v = e.target;
            loader.unobserve(v);
            const f = document.createElement('iframe');
            f.loading = 'lazy';
            f.tabIndex = -1;
            f.setAttribute('aria-hidden', 'true');
            f.title = '';
            f.addEventListener('load', () => f.classList.add('ready'));
            f.src = v.dataset.src;
            v.prepend(f);
            fit(v);
        });
    }, { rootMargin: '300px 0px' });
    views.forEach((v) => { ro.observe(v); loader.observe(v); });

    /* ---------- 埋め込み (Projects) ---------- */
    const embedLoader = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (!e.isIntersecting) return;
            const v = e.target;
            embedLoader.unobserve(v);
            const f = document.createElement('iframe');
            f.title = v.dataset.title || 'Dolphin Playground';
            f.allowFullscreen = true;
            f.referrerPolicy = 'strict-origin-when-cross-origin';
            f.loading = 'lazy';
            f.addEventListener('load', () => f.classList.add('ready'));
            f.src = v.dataset.embed;
            v.prepend(f);
        });
    }, { rootMargin: '300px 0px' });
    document.querySelectorAll('.embed__view').forEach((v) => embedLoader.observe(v));

    /* ---------- Three.js ---------- */
    const canvas = document.getElementById('bg');
    if (!window.THREE) { root.classList.add('no-webgl'); return; }

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch (err) {
        root.classList.add('no-webgl');
        return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x05060a, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05060a, 0.018);
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    camera.position.set(0, 1.5, 14);

    const colA = new THREE.Color(0x5ef2ff);
    const colB = new THREE.Color(0x8b5cff);
    const uA = { value: colA.clone() };
    const uB = { value: colB.clone() };
    const uTime = { value: 0 };
    const uMouse = { value: new THREE.Vector2(999, 999) };

    /* 波打つパーティクルの地形 */
    const N = innerWidth < 700 ? 140 : 220;
    const STEP = 0.36;
    const pos = new Float32Array(N * N * 3);
    const seed = new Float32Array(N * N);
    for (let ix = 0; ix < N; ix++) {
        for (let iz = 0; iz < N; iz++) {
            const k = ix * N + iz;
            pos[k * 3] = (ix - N / 2) * STEP;
            pos[k * 3 + 1] = 0;
            pos[k * 3 + 2] = (iz - N / 2) * STEP - 8;
            seed[k] = Math.random();
        }
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const pointsMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime, uMouse, uA, uB, uPR: { value: renderer.getPixelRatio() } },
        vertexShader: `
            uniform float uTime; uniform vec2 uMouse; uniform float uPR;
            attribute float aSeed;
            varying float vH; varying float vD;
            void main() {
                vec3 p = position;
                float w = sin(p.x * 0.35 + uTime * 0.8) * 0.6
                        + sin(p.z * 0.30 + uTime * 0.6) * 0.6
                        + sin((p.x + p.z) * 0.15 + uTime * 0.4) * 0.9;
                float m = distance(p.xz, uMouse);
                w += exp(-m * m * 0.07) * 1.7 * sin(m * 2.6 - uTime * 4.0);
                p.y = w - 4.2;
                vH = w;
                vec4 mv = modelViewMatrix * vec4(p, 1.0);
                vD = -mv.z;
                gl_PointSize = (1.5 + aSeed * 1.8) * uPR * (20.0 / -mv.z);
                gl_Position = projectionMatrix * mv;
            }`,
        fragmentShader: `
            uniform vec3 uA; uniform vec3 uB;
            varying float vH; varying float vD;
            void main() {
                vec2 c = gl_PointCoord - 0.5;
                float a = smoothstep(0.5, 0.0, length(c));
                vec3 col = mix(uA, uB, smoothstep(-1.6, 2.6, vH));
                float fade = smoothstep(70.0, 12.0, vD);
                gl_FragColor = vec4(col * (0.7 + vH * 0.25), a * 0.85 * fade);
            }`
    });
    const points = new THREE.Points(pg, pointsMat);
    points.frustumCulled = false;
    scene.add(points);

    /* 歪むワイヤーフレーム */
    const orb = new THREE.Group();
    const orbMat = new THREE.ShaderMaterial({
        wireframe: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime, uA, uB, uAmp: { value: 0.22 } },
        vertexShader: `
            uniform float uTime; uniform float uAmp;
            varying vec3 vN; varying float vD;
            void main() {
                vec3 p = position;
                float d = sin(p.x * 2.4 + uTime) * sin(p.y * 2.4 + uTime * 1.3) * sin(p.z * 2.4 + uTime * 0.7);
                p += normalize(position) * d * uAmp * 2.0;
                vD = d;
                vN = normalize(normalMatrix * normalize(position));
                gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
            }`,
        fragmentShader: `
            uniform vec3 uA; uniform vec3 uB;
            varying vec3 vN; varying float vD;
            void main() {
                float f = pow(1.0 - abs(vN.z), 1.4);
                vec3 c = mix(uA, uB, clamp(vD * 1.6 + 0.5, 0.0, 1.0));
                gl_FragColor = vec4(c * (0.6 + f * 1.4), 0.28 + f * 0.7);
            }`
    });
    const orbMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(2.4, 3), orbMat);
    orb.add(orbMesh);
    const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.1, 1),
        new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.35 })
    );
    orb.add(core);
    scene.add(orb);

    /* セクションごとの目標値 */
    const scenes = [
        { x: 5.4, y: 1.5, s: 0.9, a: 0x5ef2ff, b: 0x8b5cff, css: '#5ef2ff' },
        { x: -4.4, y: 1.0, s: 0.8, a: 0x8b5cff, b: 0xff5ea8, css: '#a78bff' },
        { x: 4.6, y: 0.8, s: 0.7, a: 0x5effa8, b: 0x5ef2ff, css: '#5effa8' },
        { x: -5.0, y: 1.6, s: 0.55, a: 0xffb85e, b: 0xff5ea8, css: '#ffb85e' },
        { x: 0.0, y: 2.2, s: 0.9, a: 0x5ef2ff, b: 0x8b5cff, css: '#5ef2ff' }
    ];
    let target = scenes[0];
    const cur = { x: scenes[0].x, y: scenes[0].y, s: scenes[0].s };
    const secObs = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (e.isIntersecting) {
                target = scenes[+e.target.dataset.scene];
                root.style.setProperty('--accent', target.css);
            }
        });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('[data-scene]').forEach((s) => secObs.observe(s));

    /* 入力 */
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 4.2);
    const hit = new THREE.Vector3();
    const glow = document.getElementById('glow');
    addEventListener('pointermove', (e) => {
        mouse.tx = (e.clientX / innerWidth) * 2 - 1;
        mouse.ty = -((e.clientY / innerHeight) * 2 - 1);
        glow.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
        glow.classList.add('on');
    }, { passive: true });
    document.addEventListener('pointerleave', () => glow.classList.remove('on'));

    const resize = () => {
        const w = innerWidth, h = innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    };
    addEventListener('resize', resize);
    resize();

    const clock = new THREE.Clock();
    let running = true;
    document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) clock.getDelta(); });
    const lerp = (a, b, t) => a + (b - a) * t;
    const tmpA = new THREE.Color(), tmpB = new THREE.Color();

    const frame = () => {
        requestAnimationFrame(frame);
        if (!running) return;
        const dt = Math.min(clock.getDelta(), 0.05);
        uTime.value += dt * (reduce ? 0.15 : 1);

        mouse.x = lerp(mouse.x, mouse.tx, 0.06);
        mouse.y = lerp(mouse.y, mouse.ty, 0.06);

        // マウス位置を地形の平面に投影
        ray.setFromCamera(new THREE.Vector2(mouse.tx, mouse.ty), camera);
        if (ray.ray.intersectPlane(plane, hit)) uMouse.value.set(hit.x, hit.z);

        // スクロール量でカメラが前に進む
        const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
        const p = scrollY / max;
        camera.position.z = lerp(camera.position.z, 14 - p * 5, 0.06);
        camera.position.x = lerp(camera.position.x, mouse.x * 1.2, 0.05);
        camera.position.y = lerp(camera.position.y, 1.5 + mouse.y * 0.6 + p * 1.2, 0.05);
        camera.lookAt(0, -1 + p * 1.5, 0);

        // 立体：目標位置へ滑らかに移動
        const narrow = innerWidth < 900;
        const tx = narrow ? 0 : target.x;
        // スマホ幅：ヒーローでは見出しの上、それ以外は文字と重ならないよう画面の上端へ
        const ty = narrow ? (target === scenes[0] ? 3.2 : 4.8) : target.y;
        const ts = narrow ? target.s * (target === scenes[0] ? 0.55 : 0.4) : target.s;
        cur.x = lerp(cur.x, tx, 0.04);
        cur.y = lerp(cur.y, ty, 0.04);
        cur.s = lerp(cur.s, ts, 0.04);
        orb.position.set(cur.x, cur.y, 0);
        orb.scale.setScalar(cur.s);
        orbMesh.rotation.y += dt * 0.18;
        orbMesh.rotation.x += dt * 0.07;
        core.rotation.y -= dt * 0.3;
        core.rotation.z += dt * 0.12;
        orb.rotation.y = mouse.x * 0.5;
        orb.rotation.x = -mouse.y * 0.35;

        // 色の遷移
        tmpA.setHex(target.a); tmpB.setHex(target.b);
        uA.value.lerp(tmpA, 0.03);
        uB.value.lerp(tmpB, 0.03);

        renderer.render(scene, camera);
    };
    frame();
})();
