document.addEventListener('DOMContentLoaded', function () {
    const cardList = document.getElementById('cardList');
    const searchInput = document.getElementById('searchInput');
    const editableCardTitle = document.getElementById('editableCardTitle');
    const editableCardContent = document.getElementById('editableCardContent');
    const saveCardButton = document.getElementById('saveCardButton');
    const viewLogButton = document.getElementById('viewLogButton');
    const cardMetadata = document.getElementById('cardMetadata');
    const currentDate = "{{ current_date }}";  // Дата, переданная из FastAPI (через Jinja2)

    const cards = JSON.parse(`{{ cards|tojson|safe }}`);  // Данные карточек, переданные из FastAPI (через Jinja2)
    let cardLogs = [];
    let currentCard = null;

    // Функция для отображения карточек в левой панели
    function renderCards(filter = '') {
        cardList.innerHTML = '';
        cards
            .filter(card => card.title.toLowerCase().includes(filter.toLowerCase()))
            .forEach(card => {
                const cardElement = document.createElement('div');
                cardElement.className = 'p-3 rounded-4 border card-item d-flex justify-content-between align-items-center ' +
                                        (card.reviewDate < currentDate ? 'review-date-warning' : '');
                cardElement.dataset.cardId = card.id;
                cardElement.innerHTML = `
                    <div>${card.title}</div>
                    <div class="text-muted">
                        <small>Created: ${card.createdAt}</small><br>
                        <small>Review: ${card.reviewDate || 'N/A'}</small>
                    </div>
                `;
                cardList.appendChild(cardElement);
            });
    }

    // Обработчик клика по карточке в левой панели
    cardList.addEventListener('click', function (e) {
        if (e.target.classList.contains('card-item')) {
            const cardId = parseInt(e.target.dataset.cardId);
            currentCard = cards.find(card => card.id === cardId);

            if (currentCard) {
                editableCardTitle.value = currentCard.title;
                editableCardContent.value = currentCard.content;
                editableCardTitle.disabled = false;
                editableCardContent.disabled = false;
                saveCardButton.disabled = false;

                // Показать метаданные
                cardMetadata.textContent = `Created: ${currentCard.createdAt} | Last Updated: ${currentCard.updatedAt} | Author: ${currentCard.author}`;
            }
        }
    });

    // Сохранение изменений карточки
    saveCardButton.addEventListener('click', function () {
        if (currentCard) {
            const oldTitle = currentCard.title;
            const oldContent = currentCard.content;

            currentCard.title = editableCardTitle.value;
            currentCard.content = editableCardContent.value;
            currentCard.updatedAt = new Date().toISOString().split('T')[0];

            // Лог изменений
            if (!currentCard.logs) {
                currentCard.logs = [];
            }

            currentCard.logs.push({
                timestamp: new Date().toISOString(),
                action: 'Updated',
                oldTitle: oldTitle,
                newTitle: currentCard.title,
                oldContent: oldContent,
                newContent: currentCard.content
            });

            renderCards(searchInput.value);
            alert('Card updated successfully!');
        }
    });

    // Фильтрация карточек по тексту в поле поиска
    searchInput.addEventListener('input', function() {
        renderCards(searchInput.value);
    });

    // Отображение логов изменений
    viewLogButton.addEventListener('click', function () {
        if (!currentCard || !currentCard.logs || currentCard.logs.length === 0) {
            alert('No logs available for this card');
        } else {
            const logModalContent = currentCard.logs
                .map(log => `
                    <div class="p-2 border-bottom">
                        <strong>Timestamp:</strong> ${log.timestamp}<br>
                        <strong>Action:</strong> ${log.action}<br>
                        <strong>Old Title:</strong> ${log.oldTitle || 'N/A'}<br>
                        <strong>New Title:</strong> ${log.newTitle || 'N/A'}<br>
                        <strong>Old Content:</strong> ${log.oldContent || 'N/A'}<br>
                        <strong>New Content:</strong> ${log.newContent || 'N/A'}<br>
                    </div>
                `)
                .join('');
            alert(logModalContent);
        }
    });

    // Фильтрация карточек по просроченным
    document.getElementById('filterOverdue').addEventListener('click', function() {
        cards.sort((a, b) => {
            const aIsOverdue = a.reviewDate < currentDate;
            const bIsOverdue = b.reviewDate < currentDate;
            return (aIsOverdue === bIsOverdue) ? 0 : aIsOverdue ? -1 : 1;
        });
        renderCards(searchInput.value);
    });

    // Фильтрация карточек по дате
    document.getElementById('filterDate').addEventListener('click', function() {
        cards.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        renderCards(searchInput.value);
    });

    // Фильтрация карточек по автору
    document.getElementById('filterAuthor').addEventListener('click', function() {
        cards.sort((a, b) => a.author.localeCompare(b.author));
        renderCards(searchInput.value);
    });

    // Фильтрация карточек по алфавиту
    document.getElementById('filterAlphabet').addEventListener('click', function() {
        cards.sort((a, b) => a.title.localeCompare(b.title));
        renderCards(searchInput.value);
    });

    // Инициализация отображения карточек
    renderCards();

});
