const dotenv = require("dotenv");
dotenv.config({
  path: process.env.NODE_ENV === "production" ? ".env" : ".env.local",
});

const {
  sequelize,
  User,
  Organisation,
  Activity,
  Chat,
  ChatMessage,
  ChatMessageSeen,
} = require("./model");

const data = {
  users: [
    {
      id: 1,
      firstname: "Alice",
      lastname: "Martin",
      pseudo: "alice",
      email: "alice@example.com",
      password: "azerty",
      city: "Lyon",
      role: "user",
    },
    {
      id: 2,
      firstname: "Bob",
      lastname: "Durand",
      pseudo: "bob",
      email: "bob@example.com",
      password: "azerty",
      city: "Grenoble",
      role: "user",
    },
    {
      id: 3,
      firstname: "Clara",
      lastname: "Admin",
      pseudo: "clara",
      email: "clara@example.com",
      password: "azerty",
      city: "Annecy",
      role: "admin",
    },
  ],
  organisations: [
    {
      id: 1,
      name: "Bar du Meeple",
      address: "12 Rue des Jeux, 69001 Lyon",
      ownerId: 1,
    },
    {
      id: 2,
      name: "Cafe Strategie",
      address: "5 Avenue des Pions, 74000 Annecy",
      ownerId: 2,
    },
  ],
  activities: [
    {
      id: 1,
      title: "Soiree jeux au Bar du Meeple",
      description: "Decouverte de jeux modernes, tous niveaux.",
      gameId: 11,
      date: "2025-12-13T19:30:00.000Z",
      address: "12 Rue des Jeux",
      city: "Lyon",
      postalCode: "69001",
      place_name: "Bar du Meeple",
      seats: 16,
      type: "Bar/Soiree",
      homeHost: false,
      price: 5,
      private: false,
      hostOrganisationId: 1,
    },
    {
      id: 2,
      title: "Partie Catan chez Alice",
      description: "Partie chill de Catan, debutants bienvenus.",
      gameId: 101,
      date: "2026-03-03T20:00:00.000Z",
      address: "122 Avenue des Ludistes",
      city: "Annecy",
      postalCode: "74000",
      seats: 4,
      type: "Par des joueurs",
      homeHost: true,
      price: 0,
      private: true,
      hostUserId: 1,
    },
    {
      id: 3,
      title: "Tournament Azul - Cafe Strategie",
      description: "Tournoi d'Azul avec lots a gagner.",
      gameId: 12,
      date: "2026-03-10T14:00:00.000Z",
      address: "5 Avenue des Pions",
      city: "Annecy",
      postalCode: "74000",
      place_name: "Cafe Strategie",
      seats: 20,
      type: "Bar/Soiree",
      homeHost: false,
      price: 8,
      private: false,
      hostOrganisationId: 2,
    },
    {
      id: 4,
      title: "Soiree Werewolf chez Bob",
      description: "Grande partie de Loup-Garou, ambiance garantie.",
      gameId: 15,
      date: "2026-03-05T21:00:00.000Z",
      address: "45 Rue de la Croix",
      city: "Grenoble",
      postalCode: "38000",
      seats: 10,
      type: "Par des joueurs",
      homeHost: true,
      price: 0,
      private: true,
      hostUserId: 2,
    },
  ],
  activityUsers: [
    { activityId: 1, userId: 1 },
    { activityId: 1, userId: 2 },
    { activityId: 2, userId: 1 },
    { activityId: 2, userId: 2 },
    { activityId: 3, userId: 2 },
    { activityId: 4, userId: 2 },
  ],
  chats: [
    { id: 1, activityId: 1 },
    { id: 2, activityId: 2 },
    { id: 3, activityId: 3 },
    { id: 4, activityId: 4 },
  ],
  chatUsers: [
    { chatId: 1, userId: 1 },
    { chatId: 1, userId: 2 },
    { chatId: 2, userId: 1 },
    { chatId: 2, userId: 2 },
    { chatId: 3, userId: 2 },
    { chatId: 4, userId: 2 },
  ],
  messages: [
    {
      id: 1,
      userId: 1,
      chatId: 1,
      content: "Salut, j'arrive vers 20h",
      createdAt: "2025-02-20T18:00:00.000Z",
    },
    {
      id: 2,
      userId: 2,
      chatId: 1,
      content: "Top, j'apporte Dixit et Just One",
      createdAt: "2025-02-20T18:05:00.000Z",
    },
    {
      id: 3,
      userId: 1,
      chatId: 2,
      content: "Je prepare le plateau de Catan",
      createdAt: "2025-02-21T19:00:00.000Z",
    },
  ],
  messageSeens: [],
};

async function seed() {
  const ActivityUsers = sequelize.models.ActivityUsers;
  const ChatUsers = sequelize.models.ChatUsers;
  const resetSchema = process.env.SEED_RESET === "true";
  const dropSchema = process.env.SEED_DROP === "true";

  if (dropSchema) {
    // Drop all tables before syncing (dangerous: wipes data)
    await sequelize.drop();
  }

  await sequelize.sync(resetSchema ? { force: true } : {});

  await sequelize.transaction(async (transaction) => {
    await User.bulkCreate(data.users, {
      individualHooks: true,
      transaction,
    });

    await Organisation.bulkCreate(data.organisations, { transaction });

    await Activity.bulkCreate(data.activities, { transaction });

    if (ActivityUsers && data.activityUsers.length) {
      await ActivityUsers.bulkCreate(data.activityUsers, { transaction });
    }

    const chatHasActivityId = !!Chat.rawAttributes.activityId;
    const activityHasChatId = !!Activity.rawAttributes.chatId;

    const chatsToInsert = data.chats.map((chat) => ({
      id: chat.id,
      ...(chatHasActivityId ? { activityId: chat.activityId } : {}),
    }));

    await Chat.bulkCreate(chatsToInsert, { transaction });

    if (activityHasChatId) {
      const updates = data.chats.map((chat) =>
        Activity.update(
          { chatId: chat.id },
          { where: { id: chat.activityId }, transaction, validate: false }
        )
      );
      await Promise.all(updates);
    }

    if (ChatUsers && data.chatUsers.length) {
      await ChatUsers.bulkCreate(data.chatUsers, { transaction });
    }

    await ChatMessage.bulkCreate(
      data.messages.map((message) => ({
        ...message,
        updatedAt: message.createdAt,
      })),
      { transaction }
    );

    if (ChatMessageSeen && data.messageSeens.length) {
      await ChatMessageSeen.bulkCreate(data.messageSeens, { transaction });
    }
  });
}

seed()
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  })
  .finally(() => sequelize.close());
