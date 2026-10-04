(function () {
    const input = document.getElementById('topic-search');
    if (!input) return;

    const clearBtn = document.getElementById('search-clear');
    const statusEl = document.getElementById('search-status');
    const emptyEl = document.getElementById('search-empty');

    const modules = Array.from(document.querySelectorAll('.module'));
    const lessonLinks = Array.from(document.querySelectorAll('.lessons a'));
    const totalLessons = lessonLinks.length;

    let initialStateCaptured = false;
    let initialOpenState = [];
    let debounceTimer = null;

    // Подготовка: оборачиваем текст темы в span, чтобы можно было подсвечивать совпадения
    lessonLinks.forEach(link => {
        if (link.querySelector('.ls-text')) return;

        const numberEl = link.querySelector('.ln');
        const textNodes = Array.from(link.childNodes).filter(node => node !== numberEl);
        const text = textNodes
            .map(node => node.textContent)
            .join('')
            .replace(/\s+/g, ' ')
            .trim();

        textNodes.forEach(node => {
            if (node.parentNode) node.parentNode.removeChild(node);
        });

        const span = document.createElement('span');
        span.className = 'ls-text';
        span.dataset.original = text;
        span.textContent = text;
        link.appendChild(span);
    });

    function normalize(str) {
        return str
            .toLowerCase()
            .replace(/ё/g, 'е')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function escapeHtml(str) {
        return str.replace(/[&<>"']/g, char => {
            switch (char) {
                case '&': return '&amp;';
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '"': return '&quot;';
                case "'": return '&#39;';
                default: return char;
            }
        });
    }

    function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Собираем регулярку для подсветки с учётом е/ё
    function buildHighlightRegex(tokens) {
        if (!tokens.length) return null;

        const sortedTokens = tokens.slice().sort((a, b) => b.length - a.length);

        const patterns = sortedTokens.map(token => {
            return token
                .split('')
                .map(char => {
                    if (char === 'е' || char === 'ё') return '[её]';
                    return escapeRegExp(char);
                })
                .join('');
        });

        return new RegExp('(' + patterns.join('|') + ')', 'gi');
    }

    function captureInitialState() {
        if (initialStateCaptured) return;
        initialOpenState = modules.map(module => module.classList.contains('open'));
        initialStateCaptured = true;
    }

    function resetSearch() {
        modules.forEach((module, index) => {
            module.classList.remove('is-hidden');

            if (initialStateCaptured) {
                if (initialOpenState[index]) {
                    module.classList.add('open');
                } else {
                    module.classList.remove('open');
                }
            }

            module.querySelectorAll('.lessons li').forEach(li => {
                li.classList.remove('is-hidden');
            });

            module.querySelectorAll('.ls-text').forEach(span => {
                span.textContent = span.dataset.original || '';
            });
        });

        statusEl.innerHTML = 'Всего тем в программе: <b>' + totalLessons + '</b>. Введите запрос для поиска.';
        emptyEl.hidden = true;
        clearBtn.hidden = true;
    }

    function runSearch() {
        const rawValue = input.value.trim();
        clearBtn.hidden = rawValue.length === 0;

        if (!rawValue) {
            resetSearch();
            return;
        }

        captureInitialState();

        const tokens = normalize(rawValue).split(' ').filter(Boolean);
        const highlightRegex = buildHighlightRegex(tokens);
        let foundCount = 0;

        modules.forEach(module => {
            const lessonItems = Array.from(module.querySelectorAll('.lessons li'));
            let visibleInModule = 0;

            lessonItems.forEach(li => {
                const link = li.querySelector('a');
                const span = link ? link.querySelector('.ls-text') : null;
                const numberEl = link ? link.querySelector('.ln') : null;

                if (!span) {
                    li.classList.add('is-hidden');
                    return;
                }

                const originalText = span.dataset.original || '';
                const normalizedText = normalize(originalText);
                const lessonNumber = numberEl ? numberEl.textContent.trim() : '';

                const isMatch = tokens.every(token => {
                    // Если токен — число, ищем ещё и по номеру занятия
                    if (/^\d+$/.test(token)) {
                        return lessonNumber === token || normalizedText.includes(token);
                    }
                    return normalizedText.includes(token);
                });

                if (isMatch) {
                    li.classList.remove('is-hidden');
                    visibleInModule++;
                    foundCount++;

                    if (highlightRegex) {
                        span.innerHTML = escapeHtml(originalText).replace(highlightRegex, '<mark>$1</mark>');
                    }
                } else {
                    li.classList.add('is-hidden');
                    span.textContent = originalText;
                }
            });

            if (visibleInModule > 0) {
                module.classList.remove('is-hidden');
                module.classList.add('open');
            } else {
                module.classList.add('is-hidden');
                module.classList.remove('open');
            }
        });

        statusEl.innerHTML = 'Найдено тем: <b>' + foundCount + '</b> из ' + totalLessons;
        emptyEl.hidden = foundCount !== 0;
    }

    function onInput() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(runSearch, 120);
    }

    input.addEventListener('input', onInput);
    input.addEventListener('search', onInput);

    clearBtn.addEventListener('click', () => {
        input.value = '';
        resetSearch();
        input.focus();
    });

    // Горячая клавиша "/" — быстрый переход к поиску
    document.addEventListener('keydown', event => {
        if (event.key !== '/') return;

        const tag = document.activeElement && document.activeElement.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        event.preventDefault();
        input.focus();
        input.select();
    });

    resetSearch();
})();