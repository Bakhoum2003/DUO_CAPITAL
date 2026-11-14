// Exécuté avant chaque fichier de test : verrouille l'environnement.
// - NODE_ENV vaut « test » ;
// - DATABASE_URL (base de développement/production) est retirée du processus de test : même par erreur,
//   aucun test ne peut s'y connecter. Les tests n'utilisent que TEST_DATABASE_URL ou la base en mémoire.
process.env.NODE_ENV = 'test'
delete process.env.DATABASE_URL
