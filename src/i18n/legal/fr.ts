import type { LegalTexts } from "./types";

export const legalFr: LegalTexts = {
  terms: {
    title: "Conditions de vente",
    intro: "Ces conditions s'appliquent à toute commande passée sur {store}. En commandant, vous les acceptez.",
    sections: [
      {
        heading: "Ce que nous vendons",
        paragraphs: [
          "Des produits numériques (comptes de jeux, clés de jeux, monnaie de jeux mobiles, abonnements) livrés par e-mail ou dans le chat privé de votre commande, et des produits physiques (IEMs) livrés en Tunisie.",
          "Les pages produit décrivent ce que vous recevez, y compris la plateforme, la région et la durée quand c'est important. Lisez-les avant de commander ; posez-nous vos questions dans le chat.",
        ],
      },
      {
        heading: "Prix et paiement",
        paragraphs: [
          "Les prix sont en dinar tunisien (DT) et sont revérifiés par le serveur au moment de la commande. Les commandes physiques peuvent avoir des frais de livraison, affichés avant de commander.",
          "Les produits numériques se paient en ligne avec l'un des moyens proposés, puis nous confirmons après vérification de votre preuve de paiement. Les produits physiques se paient en espèces à la livraison.",
          "Payez uniquement aux coordonnées indiquées sur la page de votre commande. Nous ne vous demanderons jamais votre mot de passe ni vos codes de connexion.",
        ],
      },
      {
        heading: "Livraison",
        paragraphs: [
          "Les produits numériques sont livrés après confirmation du paiement, généralement dans l'heure pendant nos horaires ({from}h00–{to}h00, heure de Tunisie). Les commandes confirmées la nuit sont livrées à notre retour.",
          "Les produits physiques sont livrés à l'adresse indiquée lors de la commande. Les délais dépendent du transporteur.",
          "Certaines recharges nécessitent l'accès à votre compte de jeu. Envoyez ces informations uniquement dans le chat de la commande en cochant « Ce message contient des identifiants », et changez votre mot de passe une fois la commande terminée.",
        ],
      },
      {
        heading: "Annulations et remboursements",
        paragraphs: [
          "Vous pouvez annuler vous-même une commande depuis sa page tant qu'elle est en attente (avant la confirmation du paiement).",
          "Un produit numérique livré ne peut pas être retourné, car il ne peut pas être repris. S'il ne fonctionne pas ou ne correspond pas à la description, signalez-le dans le chat de la commande sous 7 jours : nous le corrigerons, le remplacerons ou vous rembourserons.",
          "Si nous annulons une commande payée (par exemple si un produit n'est plus disponible), nous remboursons le montant total, par le même moyen de paiement lorsque c'est possible.",
          "Les produits physiques doivent être vérifiés à la livraison. Signalez un article abîmé ou erroné sous 7 jours dans le chat de la commande ou via nos contacts.",
        ],
      },
      {
        heading: "Votre compte",
        paragraphs: [
          "Gardez vos identifiants privés. Les commandes passées depuis votre compte sont considérées comme passées par vous.",
          "Nous pouvons refuser ou annuler une commande en cas de suspicion de fraude, d'erreur de prix ou d'utilisation abusive de la boutique.",
        ],
      },
    ],
  },
  privacy: {
    title: "Politique de confidentialité",
    intro: "Cette page explique ce que {store} collecte sur vous, pourquoi, et ce que vous pouvez nous demander d'en faire.",
    sections: [
      {
        heading: "Ce que nous collectons",
        paragraphs: [
          "Votre compte : nom, e-mail et mot de passe (stocké chiffré de façon irréversible ; nous ne le voyons jamais), ou le nom et l'e-mail de votre compte Google si vous vous connectez avec Google.",
          "Vos commandes : ce que vous achetez, les prix, le moyen de paiement et, pour les livraisons, votre téléphone et votre adresse.",
          "Le chat de vos commandes : les messages et photos que vous envoyez (par exemple, vos preuves de paiement).",
          "Pour les commandes AliExpress que nous gérons pour vous : le nom, le téléphone, l'adresse et l'article que vous nous donnez.",
        ],
      },
      {
        heading: "Pourquoi nous les utilisons",
        paragraphs: [
          "Uniquement pour faire fonctionner la boutique : prendre et livrer vos commandes, vérifier les paiements, vous répondre, envoyer les e-mails de commande et prévenir la fraude. Nous ne vendons pas vos données et n'envoyons pas d'e-mails publicitaires.",
        ],
      },
      {
        heading: "Comment nous les protégeons",
        paragraphs: [
          "Les chats de commande et leurs photos sont stockés chiffrés. Les photos du chat sont des fichiers privés que seuls vous et notre équipe pouvez ouvrir.",
          "Les messages marqués comme contenant des identifiants restent masqués jusqu'à leur ouverture et sont effacés automatiquement après {days} jours ; chacun peut les effacer plus tôt.",
          "Les pages publiques de suivi AliExpress n'affichent votre nom, téléphone et adresse que partiellement (masqués).",
        ],
      },
      {
        heading: "Qui d'autre les traite",
        paragraphs: [
          "Les prestataires qui nous aident à faire fonctionner la boutique : notre hébergeur et fournisseur de base de données, Cloudinary (stockage des images), notre fournisseur d'e-mails (e-mails de commande) et Google si vous choisissez de vous connecter avec Google. Ils ne traitent les données que pour fournir leur service.",
        ],
      },
      {
        heading: "Cookies et stockage",
        paragraphs: [
          "Nous utilisons un cookie de connexion (pour vous garder connecté), un cookie de langue (anglais ou français) et le stockage de votre navigateur pour votre panier. Aucun cookie publicitaire ou de pistage.",
        ],
      },
      {
        heading: "Durée de conservation",
        paragraphs: ["Les commandes et leur chat sont conservés le temps nécessaire à la commande, au service après-vente et à nos obligations comptables. Vous pouvez demander la suppression de votre compte à tout moment."],
      },
      {
        heading: "Vos droits",
        paragraphs: ["Vous pouvez demander à consulter, corriger ou supprimer vos données personnelles en nous contactant via les canaux ci-dessous."],
      },
    ],
  },
};
