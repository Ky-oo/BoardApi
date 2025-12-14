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
} = require("./model");

// Hard-coded dataset
const db = {
  users: [
    {
      id: 1,
      firstname: "Alice",
      lastname: "Martin",
      pseudo: "aliceMartin",
      email: "alice@gmail.com",
      password: "azerty",
      city: "Lyon",
      role: "user",
    },
    {
      id: 2,
      firstname: "Bob",
      lastname: "Durand",
      pseudo: "bobDurand",
      email: "bob@gmail.com",
      password: "azerty",
      city: "Grenoble",
      role: "user",
    },
    {
      id: 3,
      firstname: "Clara",
      lastname: "Admin",
      pseudo: "claraAdmin",
      email: "clara@gmail.com",
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
      name: "Café Stratège",
      address: "5 Avenue des Pions, 79002 Annecy",
      ownerId: 2,
    },
  ],
  activities: [
    {
      id: 1,
      title: "Soirée jeux au Bar du Meeple",
      description: "Découverte de jeux modernes, tous niveaux.",
      gameId: 11,
      date: "2025-12-13T19:30:00.000Z",
      address: "12 Rue des Jeux",
      city: "Lyon",
      postalCode: "69001",
      place_name: "Bar du Meeple",
      seats: 16,
      type: "Bar/Soirée",
      hostType: "organisation",
      hostId: 1,
      playersId: [1, 2],
      homeHost: false,
      price: 5,
      private: false,
    },
    {
      id: 2,
      title: "Partie Catan chez Alice",
      description: "Partie chill de Catan, débutants bienvenus.",
      gameId: 101,
      date: "2026-03-03T20:00:00.000Z",
      address: "122 Avenue des Ludistes",
      city: "Annecy",
      postalCode: "79003",
      seats: 4,
      type: "Par des joueurs",
      hostType: "user",
      hostId: 1,
      playersId: [1, 2],
      homeHost: true,
      private: true,
    },
    {
      id: 3,
      title: "Tournament Azul - Café Stratège",
      description: "Tournoi d'Azul avec lots à gagner ! Inscription sur place.",
      gameId: 12,
      date: "2026-03-10T14:00:00.000Z",
      address: "5 Avenue des Pions",
      city: "Annecy",
      postalCode: "79002",
      place_name: "Café Stratège",
      seats: 20,
      type: "Bar/Soirée",
      hostType: "organisation",
      hostId: 2,
      playersId: [],
      homeHost: false,
      price: 8,
      private: false,
    },
    {
      id: 4,
      title: "Soirée Werewolf chez Bob",
      description: "Grande partie de Loup-Garou, ambiance garantie !",
      gameId: 15,
      date: "2026-03-05T21:00:00.000Z",
      address: "45 Rue de la Croix",
      city: "Grenoble",
      postalCode: "79004",
      seats: 10,
      type: "Par des joueurs",
      hostType: "user",
      hostId: 2,
      playersId: [2],
      homeHost: true,
      private: true,
    },
    {
      id: 5,
      title: "Initiation aux jeux de plateau",
      description:
        "Séance découverte pour débutants avec animateurs expérimentés.",
      gameId: 20,
      date: "2026-03-08T18:00:00.000Z",
      address: "12 Rue des Jeux",
      city: "Lyon",
      postalCode: "69001",
      place_name: "Bar du Meeple",
      seats: 25,
      type: "Bar/Soirée",
      hostType: "organisation",
      hostId: 1,
      playersId: [1, 2, 3],
      homeHost: false,
      price: 0,
      private: false,
    },
    {
      id: 6,
      title: "Marathon Pandemic Legacy",
      description:
        "Session complète de Pandemic Legacy saison 1. Engagement sur 4h minimum.",
      gameId: 30,
      date: "2026-03-12T13:00:00.000Z",
      address: "122 Avenue des Ludistes",
      city: "Thonon-les-Bains",
      postalCode: "74003",
      seats: 4,
      type: "Par des joueurs",
      hostType: "user",
      hostId: 2,
      playersId: [1],
      homeHost: true,
      private: true,
    },
    {
      id: 7,
      title: "Soirée Échecs & Dames",
      description: "Rencontre amicale entre passionnés d'échecs et de dames.",
      gameId: 5,
      date: "2026-03-15T19:00:00.000Z",
      address: "5 Avenue des Pions",
      city: "Annecy",
      postalCode: "74002",
      place_name: "Café Stratège",
      seats: 12,
      type: "Bar/Soirée",
      hostType: "organisation",
      hostId: 2,
      playersId: [],
      homeHost: false,
      price: 3,
      private: false,
    },
    {
      id: 8,
      title: "Soirée Jeux de Rôle - Initiation",
      description: "Découverte du jeu de rôle avec D&D 5e. Matériel fourni.",
      gameId: 40,
      date: "2026-03-18T20:30:00.000Z",
      address: "8 Place Bellecour",
      city: "Annecy",
      postalCode: "74002",
      seats: 6,
      type: "Par des joueurs",
      hostType: "user",
      hostId: 3,
      playersId: [3],
      homeHost: false,
      private: false,
    },
    {
      id: 9,
      title: "Festival du Jeu - Journée Portes Ouvertes",
      description: "Grande journée ludique avec plus de 100 jeux à découvrir !",
      gameId: 50,
      date: "2026-03-20T10:00:00.000Z",
      address: "12 Rue des Jeux",
      city: "Chambéry",
      postalCode: "73001",
      place_name: "Bar du Meeple",
      seats: 50,
      type: "Festival",
      hostType: "organisation",
      hostId: 1,
      playersId: [1, 2],
      homeHost: false,
      price: 10,
      private: false,
    },
    {
      id: 10,
      title: "Soirée 7 Wonders Duel",
      description: "Tournoi rapide de 7 Wonders Duel, parties en 30min.",
      gameId: 25,
      date: "2026-03-22T18:30:00.000Z",
      address: "5 Avenue des Pions",
      city: "Lyon",
      postalCode: "69002",
      place_name: "Café Stratège",
      seats: 8,
      type: "Bar/Soirée",
      hostType: "organisation",
      hostId: 2,
      playersId: [],
      homeHost: false,
      price: 5,
      private: false,
    },
  ],
  activityPlayers: [
    { id: 1, userId: 1, activitieId: 1, status: "joined" },
    { id: 2, userId: 2, activitieId: 1, status: "joined" },
    { id: 3, userId: 1, activitieId: 2, status: "joined" },
    { id: 4, userId: 2, activitieId: 2, status: "joined" },
  ],
  chats: [
    { id: 1, usersId: null, activitieId: 1 },
    { id: 2, usersId: null, activitieId: 2 },
  ],
  chatUsers: [
    { id: 1, userId: 1, chatId: 1 },
    { id: 2, userId: 2, chatId: 1 },
    { id: 3, userId: 1, chatId: 2 },
    { id: 4, userId: 2, chatId: 2 },
  ],
  messages: [
    {
      id: 1,
      userId: 1,
      chatId: 1,
      content: "Salut, je viendrai vers 20h 🙂",
      createdAt: "2025-02-20T18:00:00.000Z",
    },
    {
      id: 2,
      userId: 2,
      chatId: 1,
      content: "Top ! J'apporte Dixit et Just One.",
      createdAt: "2025-02-20T18:05:00.000Z",
    },
    {
      id: 3,
      userId: 1,
      chatId: 2,
      content: "Je prépare le plateau de Catan 😁",
      createdAt: "2025-02-21T19:00:00.000Z",
    },
  ],
};

async function seed() {
  const ActivityUsers = sequelize.models.ActivityUsers;
  const ChatUsers = sequelize.models.ChatUsers;

  // Reset schema for a clean import; remove force: true if you need to preserve data
  await sequelize.sync(/*{ force: true }*/);

  // Users (hash passwords via hooks)
  await User.bulkCreate(db.users, { individualHooks: true });

  // Organisations
  await Organisation.bulkCreate(db.organisations);

  // Activities with explicit host fields and player links
  const activities = db.activities.map((activity) => {
    const { hostType, hostId, playersId, ...rest } = activity;
    return {
      ...rest,
      hostUserId: hostType === "user" ? hostId : null,
      hostOrganisationId: hostType === "organisation" ? hostId : null,
    };
  });
  await Activity.bulkCreate(activities);

  // Join table ActivityUsers
  if (ActivityUsers) {
    const activityUserRows = [];
    db.activities.forEach((activity) => {
      (activity.playersId || []).forEach((userId) => {
        activityUserRows.push({
          userId,
          activityId: activity.id,
          status: "joined",
        });
      });
    });
    if (activityUserRows.length) {
      await ActivityUsers.bulkCreate(activityUserRows);
    }
  }

  // Chats
  await Chat.bulkCreate(
    db.chats.map((chat) => ({
      id: chat.id,
      activityId: chat.activitieId || chat.activityId,
    }))
  );

  // ChatUsers join table
  if (ChatUsers) {
    await ChatUsers.bulkCreate(db.chatUsers);
  }

  // ChatMessages
  await ChatMessage.bulkCreate(
    db.messages.map((m) => ({
      ...m,
      createdAt: m.createdAt,
      updatedAt: m.createdAt || new Date(),
    }))
  );

  console.log("Database seeded successfully");
}

seed()
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  })
  .finally(() => sequelize.close());
